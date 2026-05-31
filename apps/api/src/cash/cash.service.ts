import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentSession(organizationId: string) {
    return this.prisma.cashRegisterSession.findFirst({
      where: { organizationId, status: 'OPEN' },
      include: {
        openedBy: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async openSession(organizationId: string, userId: string, openingBalance: number) {
    const open = await this.getCurrentSession(organizationId);
    if (open) throw new BadRequestException('Já existe um caixa aberto');

    return this.prisma.cashRegisterSession.create({
      data: {
        organizationId,
        openedByUserId: userId,
        openingBalance: new Prisma.Decimal(openingBalance),
        status: 'OPEN',
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        movements: true,
      },
    });
  }

  private sessionBalance(
    opening: Prisma.Decimal,
    movements: Array<{ movementType: string; amount: Prisma.Decimal }>,
  ) {
    let balance = Number(opening);
    for (const m of movements) {
      const amt = Number(m.amount);
      if (m.movementType === 'SUPPLY' || m.movementType === 'PAYMENT_IN') {
        balance += amt;
      } else {
        balance -= amt;
      }
    }
    return balance;
  }

  async addMovement(
    organizationId: string,
    sessionId: string,
    data: {
      movementType: 'SUPPLY' | 'WITHDRAWAL';
      amount: number;
      description?: string;
    },
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, organizationId, status: 'OPEN' },
      include: { movements: true },
    });
    if (!session) throw new NotFoundException('Caixa não encontrado ou já fechado');

    await this.prisma.cashRegisterMovement.create({
      data: {
        organizationId,
        sessionId,
        movementType: data.movementType,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
      },
    });

    return this.getCurrentSession(organizationId);
  }

  async closeSession(
    organizationId: string,
    userId: string,
    sessionId: string,
    closingBalance: number,
    notes?: string,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, organizationId, status: 'OPEN' },
      include: { movements: true },
    });
    if (!session) throw new NotFoundException('Caixa não encontrado');

    const expected = this.sessionBalance(session.openingBalance, session.movements);

    return this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedByUserId: userId,
        closedAt: new Date(),
        closingBalance: new Prisma.Decimal(closingBalance),
        expectedBalance: new Prisma.Decimal(expected),
        notes: notes ?? null,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}
