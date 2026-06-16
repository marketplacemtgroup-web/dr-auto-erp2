import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, search?: string, status?: string) {
    return this.prisma.supplier.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { legalName: { contains: search, mode: 'insensitive' } },
                { tradeName: { contains: search, mode: 'insensitive' } },
                { document: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { legalName: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return supplier;
  }

  async profile(organizationId: string, id: string) {
    const supplier = await this.findOne(organizationId, id);

    const [purchases, openPayables, totalPurchased] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, supplierId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          financialStatus: true,
          stockStatus: true,
        },
      }),
      this.prisma.financialEntry.aggregate({
        where: {
          organizationId,
          supplierId: id,
          type: 'PAYABLE',
          status: 'OPEN',
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { organizationId, supplierId: id, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      supplier,
      stats: {
        purchaseCount: totalPurchased._count._all,
        totalPurchased: Number(totalPurchased._sum.totalAmount ?? 0),
        openPayablesCount: openPayables._count._all,
        openPayablesAmount: Number(openPayables._sum.amount ?? 0),
      },
      recentPurchases: purchases,
    };
  }

  create(organizationId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        organizationId,
        personType: dto.personType,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim() ?? null,
        document: dto.document?.trim() ?? null,
        stateRegistration: dto.stateRegistration?.trim() ?? null,
        municipalRegistration: dto.municipalRegistration?.trim() ?? null,
        supplierType: dto.supplierType ?? 'OUTROS',
        status: dto.status ?? 'ACTIVE',
        contactName: dto.contactName?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        whatsapp: dto.whatsapp?.trim() ?? null,
        email: dto.email?.trim() ?? null,
        website: dto.website?.trim() ?? null,
        serviceNotes: dto.serviceNotes?.trim() ?? null,
        zipCode: dto.zipCode?.trim() ?? null,
        street: dto.street?.trim() ?? null,
        addressNumber: dto.addressNumber?.trim() ?? null,
        district: dto.district?.trim() ?? null,
        city: dto.city?.trim() ?? null,
        state: dto.state?.trim() ?? null,
        complement: dto.complement?.trim() ?? null,
        taxEmail: dto.taxEmail?.trim() ?? null,
        taxNotes: dto.taxNotes?.trim() ?? null,
        defaultPaymentDays: dto.defaultPaymentDays ?? null,
        defaultPaymentMethod: dto.defaultPaymentMethod ?? null,
        pixKey: dto.pixKey?.trim() ?? null,
        creditLimit:
          dto.creditLimit != null ? new Prisma.Decimal(dto.creditLimit) : null,
        commercialNotes: dto.commercialNotes?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(organizationId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.personType != null ? { personType: dto.personType } : {}),
        ...(dto.legalName != null ? { legalName: dto.legalName.trim() } : {}),
        ...(dto.tradeName !== undefined ? { tradeName: dto.tradeName?.trim() ?? null } : {}),
        ...(dto.document !== undefined ? { document: dto.document?.trim() ?? null } : {}),
        ...(dto.stateRegistration !== undefined
          ? { stateRegistration: dto.stateRegistration?.trim() ?? null }
          : {}),
        ...(dto.municipalRegistration !== undefined
          ? { municipalRegistration: dto.municipalRegistration?.trim() ?? null }
          : {}),
        ...(dto.supplierType != null ? { supplierType: dto.supplierType } : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName?.trim() ?? null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() ?? null } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp?.trim() ?? null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() ?? null } : {}),
        ...(dto.website !== undefined ? { website: dto.website?.trim() ?? null } : {}),
        ...(dto.serviceNotes !== undefined ? { serviceNotes: dto.serviceNotes?.trim() ?? null } : {}),
        ...(dto.zipCode !== undefined ? { zipCode: dto.zipCode?.trim() ?? null } : {}),
        ...(dto.street !== undefined ? { street: dto.street?.trim() ?? null } : {}),
        ...(dto.addressNumber !== undefined
          ? { addressNumber: dto.addressNumber?.trim() ?? null }
          : {}),
        ...(dto.district !== undefined ? { district: dto.district?.trim() ?? null } : {}),
        ...(dto.city !== undefined ? { city: dto.city?.trim() ?? null } : {}),
        ...(dto.state !== undefined ? { state: dto.state?.trim() ?? null } : {}),
        ...(dto.complement !== undefined ? { complement: dto.complement?.trim() ?? null } : {}),
        ...(dto.taxEmail !== undefined ? { taxEmail: dto.taxEmail?.trim() ?? null } : {}),
        ...(dto.taxNotes !== undefined ? { taxNotes: dto.taxNotes?.trim() ?? null } : {}),
        ...(dto.defaultPaymentDays !== undefined
          ? { defaultPaymentDays: dto.defaultPaymentDays ?? null }
          : {}),
        ...(dto.defaultPaymentMethod !== undefined
          ? { defaultPaymentMethod: dto.defaultPaymentMethod ?? null }
          : {}),
        ...(dto.pixKey !== undefined ? { pixKey: dto.pixKey?.trim() ?? null } : {}),
        ...(dto.creditLimit !== undefined
          ? {
              creditLimit:
                dto.creditLimit != null ? new Prisma.Decimal(dto.creditLimit) : null,
            }
          : {}),
        ...(dto.commercialNotes !== undefined
          ? { commercialNotes: dto.commercialNotes?.trim() ?? null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ?? null } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
