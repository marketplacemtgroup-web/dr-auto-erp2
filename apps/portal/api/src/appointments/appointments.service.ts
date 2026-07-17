import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { nextDocumentNumber } from '../common/document-number.util';
import { notDeleted } from '../common/soft-delete';
import { PrismaService } from '../prisma/prisma.service';
import { CAR_CHECKLIST_TEMPLATE } from '../service-orders/checklist-template';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
];

export const appointmentInclude = {
  vehicle: { include: { customer: true } },
  mechanic: { include: { user: true } },
  serviceOrder: { select: { id: true, number: true, status: true } },
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertNoActiveDuplicate(
    organizationId: string,
    vehicleId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.appointment.findFirst({
      where: {
        organizationId,
        vehicleId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        scheduledAt: { gte: new Date() },
      },
      select: { id: true, scheduledAt: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Este veículo já possui um agendamento ativo. Cancele ou remarque o existente.',
      );
    }
  }

  async create(organizationId: string, dto: CreateAppointmentDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId, ...notDeleted },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Data/hora do agendamento inválida');
    }

    if (dto.mechanicMemberId) {
      const mechanic = await this.prisma.organizationMember.findFirst({
        where: { id: dto.mechanicMemberId, organizationId, isActive: true },
      });
      if (!mechanic) throw new BadRequestException('Mecânico não encontrado');
    }

    const durationMinutes = dto.durationMinutes ?? 60;
    if (durationMinutes < 15) {
      throw new BadRequestException('Duração mínima: 15 minutos');
    }

    await this.assertNoActiveDuplicate(organizationId, dto.vehicleId);

    return this.prisma.appointment.create({
      data: {
        organizationId,
        vehicleId: dto.vehicleId,
        mechanicMemberId: dto.mechanicMemberId ?? null,
        scheduledAt,
        durationMinutes,
        status: dto.status ?? 'SCHEDULED',
        source: dto.source ?? 'STAFF',
        bay: dto.bay ?? null,
        notes: dto.notes ?? null,
        requestedNotes: dto.requestedNotes ?? null,
      },
      include: appointmentInclude,
    });
  }

  list(organizationId: string, from?: string, to?: string, status?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
        ...(fromDate || toDate
          ? {
              scheduledAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      include: appointmentInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const row = await this.prisma.appointment.findFirst({
      where: { id, organizationId },
      include: appointmentInclude,
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado');
    return row;
  }

  async update(organizationId: string, id: string, dto: UpdateAppointmentDto) {
    const current = await this.findOne(organizationId, id);

    if (dto.vehicleId && dto.vehicleId !== current.vehicleId) {
      await this.assertNoActiveDuplicate(organizationId, dto.vehicleId, id);
    } else if (dto.scheduledAt || dto.status) {
      const vehicleId = dto.vehicleId ?? current.vehicleId;
      const nextStatus = dto.status ?? current.status;
      if (ACTIVE_APPOINTMENT_STATUSES.includes(nextStatus as AppointmentStatus)) {
        const scheduledAt = dto.scheduledAt
          ? new Date(dto.scheduledAt)
          : current.scheduledAt;
        if (scheduledAt >= new Date()) {
          await this.assertNoActiveDuplicate(organizationId, vehicleId, id);
        }
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
        ...(dto.mechanicMemberId !== undefined
          ? { mechanicMemberId: dto.mechanicMemberId || null }
          : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.bay !== undefined ? { bay: dto.bay || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      include: appointmentInclude,
    });
  }

  async remove(organizationId: string, id: string) {
    const row = await this.findOne(organizationId, id);
    if (row.serviceOrderId) {
      throw new BadRequestException('Agendamento já convertido em OS');
    }
    await this.prisma.appointment.delete({ where: { id } });
    return { ok: true };
  }

  async completeByServiceOrder(serviceOrderId: string) {
    await this.prisma.appointment.updateMany({
      where: {
        serviceOrderId,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
      },
      data: { status: 'COMPLETED' },
    });
  }

  async cancelByServiceOrder(serviceOrderId: string) {
    await this.prisma.appointment.updateMany({
      where: {
        serviceOrderId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      data: { status: 'CANCELLED' },
    });
  }

  async convertToServiceOrder(organizationId: string, id: string) {
    const appt = await this.findOne(organizationId, id);
    if (appt.serviceOrderId) {
      throw new BadRequestException('Este agendamento já possui OS vinculada');
    }

    const number = await nextDocumentNumber(this.prisma, organizationId);

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const so = await tx.serviceOrder.create({
        data: {
          organizationId,
          vehicleId: appt.vehicleId,
          branchId: branch?.id,
          number,
          status: 'RECEIVED',
          enteredAt: appt.scheduledAt,
          estimatedAt: appt.scheduledAt,
          mechanicMemberId: appt.mechanicMemberId,
          bay: appt.bay,
          complaint: appt.notes ?? appt.requestedNotes,
          checklistItems: {
            create: CAR_CHECKLIST_TEMPLATE.map((item, idx) => ({
              organizationId,
              category: item.category,
              label: item.label,
              sortOrder: idx,
            })),
          },
          statusHistory: {
            create: {
              organizationId,
              toStatus: 'RECEIVED',
              notes: `OS aberta a partir do agendamento`,
            },
          },
        },
      });

      await tx.appointment.update({
        where: { id },
        data: {
          serviceOrderId: so.id,
          status: 'IN_PROGRESS',
        },
      });

      return tx.appointment.findFirst({
        where: { id },
        include: appointmentInclude,
      });
    });
  }
}
