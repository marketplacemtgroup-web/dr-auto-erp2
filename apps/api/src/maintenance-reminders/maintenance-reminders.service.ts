import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MaintenanceReminderStatus,
  MaintenanceReminderType,
  ServiceOrder,
  Vehicle,
} from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

type ReminderListFilter = 'overdue' | 'upcoming' | 'all';

@Injectable()
export class MaintenanceRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private isOverdue(
    reminder: {
      dueKm: number | null;
      dueDate: Date | null;
      baselineKm: number;
    },
    currentKm: number | null,
  ): boolean {
    const now = new Date();
    if (reminder.dueDate && now >= reminder.dueDate) return true;
    if (reminder.dueKm != null && currentKm != null && currentKm >= reminder.dueKm) {
      return true;
    }
    return false;
  }

  private isUpcoming(
    reminder: { dueKm: number | null; dueDate: Date | null },
    currentKm: number | null,
    days = 7,
  ): boolean {
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);

    if (reminder.dueDate && reminder.dueDate >= now && reminder.dueDate <= horizon) {
      return true;
    }
    if (reminder.dueKm != null && currentKm != null) {
      const kmLeft = reminder.dueKm - currentKm;
      if (kmLeft > 0 && kmLeft <= 500) return true;
    }
    return false;
  }

  async createFromServiceOrder(organizationId: string, serviceOrder: ServiceOrder & { vehicle: Vehicle }) {
    const baselineDate = new Date();
    const baselineKm =
      serviceOrder.entryKm ?? serviceOrder.vehicle.currentKm ?? 0;

    const specs: Array<{
      type: MaintenanceReminderType;
      intervalKm: number | null;
      intervalMonths: number | null;
    }> = [];

    if (serviceOrder.revisionIntervalKm || serviceOrder.revisionIntervalMonths) {
      specs.push({
        type: 'REVISION',
        intervalKm: serviceOrder.revisionIntervalKm,
        intervalMonths: serviceOrder.revisionIntervalMonths,
      });
    }
    if (serviceOrder.oilChangeIntervalKm || serviceOrder.oilChangeIntervalMonths) {
      specs.push({
        type: 'OIL_CHANGE',
        intervalKm: serviceOrder.oilChangeIntervalKm,
        intervalMonths: serviceOrder.oilChangeIntervalMonths,
      });
    }

    for (const spec of specs) {
      const dueKm = spec.intervalKm ? baselineKm + spec.intervalKm : null;
      const dueDate = spec.intervalMonths
        ? this.addMonths(baselineDate, spec.intervalMonths)
        : null;

      await this.prisma.maintenanceReminder.create({
        data: {
          organizationId,
          vehicleId: serviceOrder.vehicleId,
          serviceOrderId: serviceOrder.id,
          type: spec.type,
          intervalKm: spec.intervalKm,
          intervalMonths: spec.intervalMonths,
          baselineKm,
          baselineDate,
          dueKm,
          dueDate,
          status: 'ACTIVE',
        },
      });
    }
  }

  async list(organizationId: string, filter: ReminderListFilter = 'all') {
    const rows = await this.prisma.maintenanceReminder.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      include: {
        vehicle: { include: { customer: true } },
        serviceOrder: { select: { id: true, number: true, status: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { dueKm: 'asc' }],
    });

    const enriched = rows.map((r) => ({
      ...r,
      isOverdue: this.isOverdue(r, r.vehicle.currentKm),
      isUpcoming: this.isUpcoming(r, r.vehicle.currentKm),
    }));

    if (filter === 'overdue') {
      return enriched.filter((r) => r.isOverdue);
    }
    if (filter === 'upcoming') {
      return enriched.filter((r) => r.isUpcoming && !r.isOverdue);
    }
    return enriched;
  }

  async getMonthOverdueCount(organizationId: string): Promise<number> {
    const now = new Date();
    const rows = await this.prisma.maintenanceReminder.findMany({
      where: { organizationId, status: 'ACTIVE', dueDate: { lte: now } },
    });
    return rows.length;
  }

  async getMonthOverdueList(organizationId: string) {
    const now = new Date();
    return this.prisma.maintenanceReminder.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        dueDate: { lte: now },
        intervalMonths: { not: null },
      },
      include: {
        vehicle: { include: { customer: true } },
        serviceOrder: { select: { id: true, number: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: MaintenanceReminderStatus,
  ) {
    const row = await this.prisma.maintenanceReminder.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Lembrete não encontrado');

    return this.prisma.maintenanceReminder.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      include: {
        vehicle: { include: { customer: true } },
        serviceOrder: { select: { id: true, number: true } },
      },
    });
  }

  async processDueNotifications() {
    const active = await this.prisma.maintenanceReminder.findMany({
      where: { status: 'ACTIVE' },
      include: {
        vehicle: true,
        serviceOrder: { select: { number: true } },
      },
    });

    let notified = 0;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    for (const reminder of active) {
      const overdue = this.isOverdue(reminder, reminder.vehicle.currentKm);
      const upcoming = this.isUpcoming(reminder, reminder.vehicle.currentKm);
      if (!overdue && !upcoming) continue;

      if (reminder.lastNotifiedAt && reminder.lastNotifiedAt > oneDayAgo) {
        continue;
      }

      const typeLabel =
        reminder.type === 'REVISION' ? 'Revisão preventiva' : 'Troca de óleo';
      const osNum = reminder.serviceOrder.number;
      let detail = '';
      if (reminder.dueKm != null) {
        detail = `aprox. ${reminder.dueKm.toLocaleString('pt-BR')} km`;
      }
      if (reminder.dueDate) {
        const dateStr = reminder.dueDate.toLocaleDateString('pt-BR');
        detail = detail ? `${detail} ou ${dateStr}` : dateStr;
      }

      await this.events.emitCustomer(reminder.vehicleId, {
        pushTitle: `${typeLabel} — OS #${osNum}`,
        pushBody: overdue
          ? `Prazo de manutenção preventiva atingido (${detail})`
          : `Manutenção preventiva se aproxima (${detail})`,
        pushUrl: '/agendamento',
        portalNotificationType: 'manutencao_preventiva',
        serviceOrderId: reminder.serviceOrderId,
      });

      await this.prisma.maintenanceReminder.update({
        where: { id: reminder.id },
        data: { lastNotifiedAt: new Date() },
      });
      notified++;
    }

    return { notified, checked: active.length };
  }
}
