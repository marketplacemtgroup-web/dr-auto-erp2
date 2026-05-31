import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { notDeleted } from '../common/soft-delete';
import { CreateCustomerContactDto } from './dto/create-customer-contact.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerContactDto } from './dto/update-customer-contact.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const finishedStatuses: ServiceOrderStatus[] = ['FINISHED', 'DELIVERED'];

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private customerData(dto: CreateCustomerDto | UpdateCustomerDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.document !== undefined
        ? { document: dto.document.replace(/\D/g, '') || null }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email || null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      ...(dto.customerType !== undefined ? { customerType: dto.customerType } : {}),
      ...(dto.street !== undefined ? { street: dto.street || null } : {}),
      ...(dto.addressNumber !== undefined ? { addressNumber: dto.addressNumber || null } : {}),
      ...(dto.complement !== undefined ? { complement: dto.complement || null } : {}),
      ...(dto.district !== undefined ? { district: dto.district || null } : {}),
      ...(dto.city !== undefined ? { city: dto.city || null } : {}),
      ...(dto.state !== undefined ? { state: dto.state || null } : {}),
      ...(dto.zipCode !== undefined ? { zipCode: dto.zipCode || null } : {}),
      ...(dto.origin !== undefined ? { origin: dto.origin || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.isVip !== undefined ? { isVip: dto.isVip } : {}),
      ...(dto.isBlocked !== undefined ? { isBlocked: dto.isBlocked } : {}),
      ...(dto.isDelinquent !== undefined ? { isDelinquent: dto.isDelinquent } : {}),
    };
  }

  create(organizationId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        document: dto.document?.replace(/\D/g, '') || null,
        phone: dto.phone ?? null,
        whatsapp: dto.whatsapp ?? null,
        email: dto.email ?? null,
        notes: dto.notes ?? null,
        customerType: dto.customerType ?? 'PF',
        street: dto.street ?? null,
        addressNumber: dto.addressNumber ?? null,
        complement: dto.complement ?? null,
        district: dto.district ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        zipCode: dto.zipCode ?? null,
        origin: dto.origin ?? null,
        isVip: dto.isVip ?? false,
        isBlocked: dto.isBlocked ?? false,
        isDelinquent: dto.isDelinquent ?? false,
      },
      include: { _count: { select: { vehicles: true } } },
    });
  }

  list(organizationId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { document: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { vehicles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        vehicles: { where: { deletedAt: null }, orderBy: { plate: 'asc' } },
        contacts: { orderBy: { createdAt: 'asc' } },
        _count: { select: { vehicles: true } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const vehicleIds = customer.vehicles.map((v) => v.id);

    const [orders, quotes, timeline] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where: { organizationId, vehicleId: { in: vehicleIds } },
        include: {
          vehicle: { select: { plate: true, brand: true, model: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.quote.findMany({
        where: {
          organizationId,
          serviceOrder: { vehicleId: { in: vehicleIds } },
        },
        include: {
          serviceOrder: {
            select: {
              number: true,
              vehicle: { select: { plate: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      vehicleIds.length > 0
        ? this.prisma.serviceOrderStatusHistory.findMany({
            where: {
              organizationId,
              serviceOrder: { vehicleId: { in: vehicleIds } },
            },
            include: {
              serviceOrder: {
                select: { number: true, vehicle: { select: { plate: true } } },
              },
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 40,
          })
        : Promise.resolve([]),
    ]);

    const finishedOrders = orders.filter((o) => finishedStatuses.includes(o.status));
    const totalSpent = finishedOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const orderCount = orders.length;
    const lastVisit = orders[0]?.updatedAt ?? null;
    const openOrders = orders.filter(
      (o) => !finishedStatuses.includes(o.status) && o.status !== 'CANCELLED',
    ).length;
    const pendingQuotes = quotes.filter((q) => q.status === 'PENDING').length;

    const kpis = {
      totalSpent,
      averageTicket: finishedOrders.length > 0 ? totalSpent / finishedOrders.length : 0,
      orderCount,
      vehicleCount: customer._count.vehicles,
      lastVisit,
      openOrders,
      pendingQuotes,
    };

    return { ...customer, kpis, serviceOrders: orders, quotes, timeline };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateCustomerDto,
    userId?: string,
  ) {
    await this.findOne(organizationId, id);
    const updated = await this.prisma.customer.update({
      where: { id },
      data: this.customerData(dto),
      include: { _count: { select: { vehicles: true } } },
    });
    await this.audit.log(organizationId, 'customer.update', 'customer', {
      userId,
      metadata: { customerId: id, name: updated.name },
    });
    return updated;
  }

  async remove(organizationId: string, id: string, userId?: string) {
    const row = await this.findFirst(organizationId, id);
    if (!row) throw new NotFoundException('Cliente não encontrado');
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log(organizationId, 'customer.delete', 'customer', {
      userId,
      metadata: { customerId: id, name: row.name },
    });
    return { ok: true };
  }

  private findFirst(organizationId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
  }

  async addContact(
    organizationId: string,
    customerId: string,
    dto: CreateCustomerContactDto,
  ) {
    await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, organizationId },
    });
    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, organizationId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.customerContact.create({
      data: {
        organizationId,
        customerId,
        name: dto.name.trim(),
        role: dto.role ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async updateContact(
    organizationId: string,
    customerId: string,
    contactId: string,
    dto: UpdateCustomerContactDto,
  ) {
    const contact = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId, organizationId },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, organizationId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
      },
    });
  }

  async removeContact(organizationId: string, customerId: string, contactId: string) {
    const contact = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId, organizationId },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    await this.prisma.customerContact.delete({ where: { id: contactId } });
    return { ok: true };
  }
}
