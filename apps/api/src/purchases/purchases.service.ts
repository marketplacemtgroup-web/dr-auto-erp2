import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, search?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        ...(search
          ? {
              OR: [
                { number: { contains: search, mode: 'insensitive' } },
                { supplierName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreatePurchaseOrderDto) {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId } });
    const number = dto.number?.trim() || `PC-${1000 + count + 1}`;

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        number,
        supplierName: dto.supplierName,
        totalAmount: dto.totalAmount,
        status: 'ORDERED',
      },
    });
  }

  markReceived(organizationId: string, id: string) {
    return this.prisma.purchaseOrder.update({
      where: { id, organizationId },
      data: { status: 'RECEIVED' },
    });
  }
}

