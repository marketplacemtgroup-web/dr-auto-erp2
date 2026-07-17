import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { notDeleted } from '../common/soft-delete';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async global(organizationId: string, q: string) {
    const term = q.trim();
    if (term.length < 2) {
      return { customers: [], vehicles: [], serviceOrders: [], quotes: [] };
    }

    const plateTerm = term.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const num = parseInt(term.replace(/\D/g, ''), 10);

    const [customers, vehicles, serviceOrders, quotes] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
            { document: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, phone: true, document: true },
        take: 8,
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { plate: { contains: plateTerm, mode: 'insensitive' } },
            { brand: { contains: term, mode: 'insensitive' } },
            { model: { contains: term, mode: 'insensitive' } },
            { customer: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          customer: { select: { id: true, name: true } },
        },
        take: 8,
        orderBy: { plate: 'asc' },
      }),
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            ...(Number.isFinite(num) && num > 0 ? [{ number: num }] : []),
            { vehicle: { plate: { contains: plateTerm, mode: 'insensitive' } } },
            { vehicle: { customer: { name: { contains: term, mode: 'insensitive' } } } },
          ],
        },
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          vehicle: {
            select: { plate: true, customer: { select: { name: true } } },
          },
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.quote.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            ...(Number.isFinite(num) && num > 0 ? [{ number: num }] : []),
            {
              serviceOrder: {
                vehicle: { plate: { contains: plateTerm, mode: 'insensitive' } },
              },
            },
          ],
        },
        select: {
          id: true,
          number: true,
          status: true,
          amount: true,
          serviceOrder: {
            select: {
              id: true,
              number: true,
              vehicle: { select: { plate: true } },
            },
          },
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { customers, vehicles, serviceOrders, quotes };
  }
}
