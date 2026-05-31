import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockMovementService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    productId: string,
    movementType: StockMovementType,
    quantity: number,
    balanceAfter: number,
    opts?: { reason?: string; serviceOrderId?: string },
  ) {
    return this.prisma.stockMovement.create({
      data: {
        organizationId,
        productId,
        movementType,
        quantity,
        balanceAfter,
        reason: opts?.reason ?? null,
        serviceOrderId: opts?.serviceOrderId ?? null,
      },
    });
  }

  list(organizationId: string, productId?: string, limit = 100) {
    return this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        serviceOrder: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  availableStock(stock: number, reservedStock: number) {
    return stock - reservedStock;
  }
}
