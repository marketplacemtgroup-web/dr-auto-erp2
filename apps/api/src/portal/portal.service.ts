import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AttachmentEntityType, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AttachmentsService } from '../attachments/attachments.service';
import { QuotesSyncService } from '../quotes/quotes-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveLinesDto } from '../quotes/dto/approve-lines.dto';
import { EventsService } from '../events/events.service';
import { PushService } from '../push/push.service';
import { notDeleted } from '../common/soft-delete';

function normalizeDigits(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

function normalizePlate(value: string) {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function withDash(plate: string) {
  const p = normalizePlate(plate);
  if (p.length === 7) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return plate;
}

const STATUS_PT: Record<string, string> = {
  RECEIVED: 'Recebido',
  DIAGNOSIS: 'Em diagnóstico',
  AWAITING_QUOTE: 'Aguardando orçamento',
  AWAITING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  IN_PROGRESS: 'Em execução',
  AWAITING_PART: 'Aguardando peça',
  PAUSED: 'Pausado',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  FINISHED: 'Finalizado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly quotesSync: QuotesSyncService,
    private readonly events: EventsService,
    private readonly push: PushService,
    private readonly attachments: AttachmentsService,
  ) {}

  private async mapPortalAttachments(
    rows: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      entityType: AttachmentEntityType;
      storagePath: string;
      createdAt?: Date;
    }>,
  ) {
    return Promise.all(
      rows.map(async (a) => {
        let url = '';
        try {
          url = await this.attachments.resolvePortalUrl(a);
        } catch (err) {
          this.logger.warn(
            `URL do anexo ${a.id} indisponível: ${err instanceof Error ? err.message : err}`,
          );
        }
        return {
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          url,
          createdAt: a.createdAt,
        };
      }),
    );
  }

  async login(cpf: string, plate: string) {
    const cpfDigits = normalizeDigits(cpf);
    const plateNorm = normalizePlate(plate);

    const plateCandidates = Array.from(
      new Set([plateNorm, withDash(plateNorm), withDash(plate)]),
    );

    const candidates = await this.prisma.vehicle.findMany({
      where: {
        OR: [
          { plate: { in: plateCandidates } },
          { plate: { equals: plateNorm, mode: 'insensitive' } },
        ],
      },
      include: {
        customer: true,
        organization: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const match = candidates.find(
      (v) => normalizeDigits(v.customer.document ?? '') === cpfDigits,
    );

    if (!match) {
      throw new UnauthorizedException('CPF ou placa inválidos');
    }

    const payload = {
      portal: true as const,
      organizationId: match.organizationId,
      customerId: match.customerId,
      vehicleId: match.id,
    };

    return this.buildPortalSession(match.organization.name, match.customer.name, match.plate, payload);
  }

  private buildPortalSession(
    organizationName: string,
    customerName: string,
    plate: string,
    payload: { portal: true; organizationId: string; customerId: string; vehicleId: string },
  ) {
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '30d' }),
      organizationName,
      customerName,
      plate,
    };
  }

  async loginByAccessToken(token: string) {
    const access = await this.prisma.portalAccessToken.findUnique({
      where: { token },
      include: {
        vehicle: { include: { customer: true, organization: true } },
      },
    });
    if (!access || access.expiresAt < new Date()) {
      throw new NotFoundException('Link inválido ou expirado');
    }
    const payload = {
      portal: true as const,
      organizationId: access.organizationId,
      customerId: access.vehicle.customerId,
      vehicleId: access.vehicleId,
    };
    return this.buildPortalSession(
      access.vehicle.organization.name,
      access.vehicle.customer.name,
      access.vehicle.plate,
      payload,
    );
  }

  async createPortalAccessLink(
    organizationId: string,
    serviceOrderId: string,
    daysValid = 90,
  ) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, organizationId, ...notDeleted },
      include: { vehicle: true },
    });
    if (!so) throw new NotFoundException('OS não encontrada');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    await this.prisma.portalAccessToken.create({
      data: {
        organizationId,
        vehicleId: so.vehicleId,
        serviceOrderId: so.id,
        token,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
      path: `/acesso/${token}`,
      whatsappMessage: `Olá! Acompanhe seu veículo ${so.vehicle.plate} pela oficina. Acesse: {url}\n\nNo celular você pode acompanhar status e orçamentos.`,
    };
  }

  async me(ctx: { organizationId: string; vehicleId: string }) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: ctx.vehicleId, organizationId: ctx.organizationId },
      include: { customer: true, organization: true },
    });
    if (!vehicle) throw new UnauthorizedException();

    const latestSO = await this.prisma.serviceOrder.findFirst({
      where: { organizationId: ctx.organizationId, vehicleId: ctx.vehicleId },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      organizationName: vehicle.organization.name,
      customer: {
        name: vehicle.customer.name,
        document: vehicle.customer.document,
      },
      vehicle: {
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
      },
      latestServiceOrder: latestSO
        ? {
            id: latestSO.id,
            number: latestSO.number,
            status: latestSO.status,
            totalAmount: latestSO.totalAmount,
            updatedAt: latestSO.updatedAt,
          }
        : null,
    };
  }

  async getDashboard(ctx: { organizationId: string; vehicleId: string }) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: ctx.vehicleId, organizationId: ctx.organizationId, ...notDeleted },
      include: { customer: true, organization: true },
    });
    if (!vehicle) throw new UnauthorizedException();

    const [quotes, serviceOrders, mainBranch] = await Promise.all([
      this.listQuotes(ctx),
      this.prisma.serviceOrder.findMany({
        where: { organizationId: ctx.organizationId, vehicleId: ctx.vehicleId, ...notDeleted },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          complaint: true,
          estimatedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.branch.findFirst({
        where: { organizationId: ctx.organizationId, isMain: true },
        select: { address: true },
      }),
    ]);

    const latestId = serviceOrders[0]?.id;
    const attachments = latestId
      ? await this.prisma.attachment.findMany({
          where: {
            organizationId: ctx.organizationId,
            serviceOrderId: latestId,
            visibleToCustomer: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return {
      organization: {
        name: vehicle.organization.name,
        phone: vehicle.organization.phone,
        email: vehicle.organization.email,
        portalWelcome: vehicle.organization.portalWelcome,
        address: mainBranch?.address ?? null,
        logoUrl: vehicle.organization.logoUrl,
        primaryColor: vehicle.organization.primaryColor,
        accentColor: vehicle.organization.accentColor,
      },
      customer: {
        name: vehicle.customer.name,
        phone: vehicle.customer.phone,
        whatsapp: vehicle.customer.whatsapp,
      },
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        currentKm: vehicle.currentKm,
        vehicleKind: vehicle.vehicleKind,
      },
      serviceOrders: serviceOrders.map((so) => ({
        ...so,
        totalAmount: Number(so.totalAmount),
      })),
      quotes,
      attachments: await this.mapPortalAttachments(attachments),
    };
  }

  async getServiceOrderForPortal(
    ctx: { organizationId: string; vehicleId: string },
    serviceOrderId: string,
  ) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: {
        id: serviceOrderId,
        organizationId: ctx.organizationId,
        vehicleId: ctx.vehicleId,
        ...notDeleted,
      },
      include: {
        vehicle: { include: { customer: true, organization: true } },
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
        attachments: {
          where: { visibleToCustomer: true },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { lines: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!so) throw new NotFoundException('OS não encontrada');

    const normalizedItems = so.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    const timeline =
      so.statusHistory.length > 0
        ? so.statusHistory.map((h) => ({
            id: h.id,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            fromLabel: h.fromStatus ? STATUS_PT[h.fromStatus] : null,
            toLabel: STATUS_PT[h.toStatus] ?? h.toStatus,
            notes: h.notes ?? h.reason ?? null,
            userName: h.user?.name ?? null,
            createdAt: h.createdAt,
          }))
        : [
            {
              id: `${so.id}-opened`,
              fromStatus: null,
              toStatus: so.status,
              fromLabel: null,
              toLabel: STATUS_PT[so.status] ?? so.status,
              notes: 'OS aberta',
              userName: null,
              createdAt: so.createdAt,
            },
          ];

    return {
      id: so.id,
      number: so.number,
      status: so.status,
      statusLabel: STATUS_PT[so.status] ?? so.status,
      totalAmount: Number(so.totalAmount),
      complaint: so.complaint,
      diagnosis: so.diagnosis,
      customerVisibleNotes: so.customerVisibleNotes,
      estimatedAt: so.estimatedAt,
      entryKm: so.entryKm,
      createdAt: so.createdAt,
      updatedAt: so.updatedAt,
      items: normalizedItems,
      timeline,
      attachments: await this.mapPortalAttachments(so.attachments),
      quotes: so.quotes.map((q) =>
        this.mapQuoteResponse({
          ...q,
          serviceOrder: {
            id: so.id,
            number: so.number,
            status: so.status,
            totalAmount: so.totalAmount,
            customerVisibleNotes: so.customerVisibleNotes,
            items: so.items,
          },
        }),
      ),
      vehicle: {
        id: so.vehicle.id,
        plate: so.vehicle.plate,
        brand: so.vehicle.brand,
        model: so.vehicle.model,
        year: so.vehicle.year,
        color: so.vehicle.color,
        currentKm: so.vehicle.currentKm,
        vehicleKind: so.vehicle.vehicleKind,
      },
      organization: {
        phone: so.vehicle.organization.phone,
        name: so.vehicle.organization.name,
      },
      customer: {
        name: so.vehicle.customer.name,
        phone: so.vehicle.customer.phone,
        whatsapp: so.vehicle.customer.whatsapp,
        document: so.vehicle.customer.document,
      },
    };
  }

  getVapidPublicKey() {
    return { publicKey: this.push.getVapidPublicKey() };
  }

  async savePushSubscription(
    ctx: { organizationId: string; vehicleId: string },
    body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.push.saveSubscription(ctx.organizationId, ctx.vehicleId, body);
  }

  private async notifyQuoteApproved(
    ctx: { organizationId: string; vehicleId: string },
    quote: { id: string; amount: Prisma.Decimal },
    so: { id: string; number: number; vehicle: { plate: string; customer: { name: string } } },
    approvedAmount: number,
  ) {
    const amount = approvedAmount || Number(quote.amount);
    await this.events.emitOffice(ctx.organizationId, {
      type: 'quote.approved',
      title: 'Cliente aprovou o orçamento',
      message: `${so.vehicle.customer.name} — ${so.vehicle.plate} — OS #${so.number} — R$ ${amount.toFixed(2)}`,
      metadata: {
        quoteId: quote.id,
        serviceOrderId: so.id,
        serviceOrderNumber: so.number,
        customerName: so.vehicle.customer.name,
        plate: so.vehicle.plate,
        amount,
      },
      vehicleId: ctx.vehicleId,
      pushTitle: 'Orçamento aprovado',
      pushBody: `OS #${so.number} aprovada pelo cliente`,
      pushUrl: `/os/${so.id}`,
      customerPush: false,
    });
  }

  private async notifyQuoteRejected(
    organizationId: string,
    vehicleId: string,
    quote: { id: string },
    so: { id: string; number: number; vehicle: { plate: string; customer: { name: string } } },
  ) {
    await this.events.emitOffice(organizationId, {
      type: 'quote.rejected',
      title: 'Cliente recusou o orçamento',
      message: `${so.vehicle.customer.name} — ${so.vehicle.plate} — OS #${so.number}`,
      metadata: {
        quoteId: quote.id,
        serviceOrderId: so.id,
        serviceOrderNumber: so.number,
        customerName: so.vehicle.customer.name,
        plate: so.vehicle.plate,
      },
      vehicleId,
      pushTitle: 'Orçamento recusado',
      pushBody: `OS #${so.number} — cliente recusou`,
      pushUrl: `/os/${so.id}`,
      customerPush: false,
    });
  }

  private mapQuoteResponse(
    q: {
      id: string;
      status: string;
      amount: Prisma.Decimal;
      number: number | null;
      validUntil: Date | null;
      terms: string | null;
      createdAt: Date;
      lines: Array<{
        id: string;
        description: string;
        lineType: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        approved: boolean | null;
        sortOrder: number;
      }>;
      serviceOrder: {
        id: string;
        number: number;
        status: string;
        totalAmount: Prisma.Decimal;
        customerVisibleNotes: string | null;
        items: Array<{
          id: string;
          description: string;
          itemType: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
        }>;
      };
    },
  ) {
    const lines =
      q.lines.length > 0
        ? q.lines.map((line) => ({
            ...line,
            unitPrice: Number(line.unitPrice),
            discount: Number(line.discount),
          }))
        : q.serviceOrder.items.map((item, idx) => ({
            id: item.id,
            description: item.description,
            lineType: item.itemType,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            discount: 0,
            approved: null as boolean | null,
            sortOrder: idx,
          }));

    return {
      id: q.id,
      number: q.number,
      status: q.status,
      amount: Number(q.amount),
      validUntil: q.validUntil,
      terms: q.terms,
      createdAt: q.createdAt,
      lines,
      serviceOrder: {
        id: q.serviceOrder.id,
        number: q.serviceOrder.number,
        status: q.serviceOrder.status,
        totalAmount: Number(q.serviceOrder.totalAmount),
        customerVisibleNotes: q.serviceOrder.customerVisibleNotes,
        items: q.serviceOrder.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
        })),
      },
      canRespond: q.status === 'PENDING',
    };
  }

  async listQuotes(ctx: { organizationId: string; vehicleId: string }) {
    try {
      await this.quotesSync.syncForVehicle(ctx.organizationId, ctx.vehicleId);
    } catch (err) {
      this.logger.warn(
        `Sincronização de orçamentos ignorada: ${err instanceof Error ? err.message : err}`,
      );
    }

    const rows = await this.prisma.quote.findMany({
      where: {
        organizationId: ctx.organizationId,
        serviceOrder: { vehicleId: ctx.vehicleId },
        status: { not: 'DRAFT' },
        deletedAt: null,
      },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        serviceOrder: {
          include: {
            items: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((q) => this.mapQuoteResponse(q));
  }

  private async applyLineApprovals(
    quoteId: string,
    serviceOrderId: string,
    dto?: ApproveLinesDto,
  ) {
    if (!dto?.lines?.length) {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId },
        data: { approved: true },
      });
      const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
      return {
        allApproved: true,
        allRejected: false,
        approvedAmount: quote ? Number(quote.amount) : 0,
      };
    }

    for (const line of dto.lines) {
      await this.prisma.quoteLine.updateMany({
        where: { id: line.lineId, quoteId },
        data: { approved: line.approved },
      });
    }

    const lines = await this.prisma.quoteLine.findMany({ where: { quoteId } });
    const decided = lines.filter((l) => l.approved !== null);
    const approvedLines = decided.filter((l) => l.approved === true);
    const rejectedLines = decided.filter((l) => l.approved === false);

    const approvedAmount = approvedLines.reduce(
      (sum, l) => sum + Number(l.unitPrice) * l.quantity - Number(l.discount),
      0,
    );

    return {
      allApproved: lines.length > 0 && approvedLines.length === lines.length,
      allRejected: lines.length > 0 && rejectedLines.length === lines.length,
      approvedAmount,
    };
  }

  async approveQuote(
    ctx: { organizationId: string; vehicleId: string },
    quoteId: string,
    dto?: ApproveLinesDto,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        organizationId: ctx.organizationId,
        serviceOrder: { vehicleId: ctx.vehicleId },
      },
      include: { serviceOrder: true, lines: true },
    });
    if (!quote) throw new UnauthorizedException();

    const { allApproved, allRejected, approvedAmount } = await this.applyLineApprovals(
      quote.id,
      quote.serviceOrderId,
      dto,
    );

    if (allRejected) {
      return this.rejectQuote(ctx, quoteId, dto?.comment);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: 'APPROVED',
          amount: new Prisma.Decimal(approvedAmount || Number(quote.amount)),
          customerComment: dto?.comment ?? quote.customerComment,
        },
      });
      await tx.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: {
          status: allApproved ? 'APPROVED' : 'IN_PROGRESS',
          totalAmount: new Prisma.Decimal(approvedAmount || Number(quote.amount)),
        },
      });
      await tx.serviceOrderStatusHistory.create({
        data: {
          organizationId: ctx.organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: allApproved ? 'APPROVED' : 'IN_PROGRESS',
          notes: allApproved
            ? 'Orçamento aprovado pelo cliente (portal)'
            : 'Orçamento aprovado parcialmente pelo cliente',
        },
      });
      return q;
    });

    const soFull = await this.prisma.serviceOrder.findFirst({
      where: { id: quote.serviceOrderId },
      include: { vehicle: { include: { customer: true } } },
    });
    if (soFull) {
      await this.notifyQuoteApproved(ctx, updated, soFull, approvedAmount);
    }

    return updated;
  }

  async rejectQuote(
    ctx: { organizationId: string; vehicleId: string } | null,
    quoteId: string,
    comment?: string,
    opts?: { byToken?: boolean },
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        ...(ctx
          ? {
              organizationId: ctx.organizationId,
              serviceOrder: { vehicleId: ctx.vehicleId },
            }
          : {}),
      },
      include: { serviceOrder: true },
    });
    if (!quote) throw opts?.byToken ? new NotFoundException() : new UnauthorizedException();

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: 'REJECTED',
          customerComment: comment ?? quote.customerComment,
        },
      });
      await tx.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: { status: 'AWAITING_QUOTE' },
      });
      await tx.serviceOrderStatusHistory.create({
        data: {
          organizationId: quote.organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: 'AWAITING_QUOTE',
          notes: 'Orçamento recusado pelo cliente',
        },
      });
      return q;
    });

    const soFull = await this.prisma.serviceOrder.findFirst({
      where: { id: quote.serviceOrderId },
      include: { vehicle: { include: { customer: true } } },
    });
    if (soFull) {
      await this.notifyQuoteRejected(quote.organizationId, soFull.vehicleId, updated, soFull);
    }

    return updated;
  }

  async getPublicQuote(token: string) {
    const access = await this.prisma.quoteAccessToken.findUnique({
      where: { token },
      include: {
        quote: {
          include: {
            lines: { orderBy: { sortOrder: 'asc' } },
            organization: true,
            serviceOrder: {
              include: {
                vehicle: { include: { customer: true } },
                items: { orderBy: { createdAt: 'asc' } },
                attachments: {
                  where: { showOnQuote: true, visibleToCustomer: true },
                },
              },
            },
          },
        },
      },
    });

    if (!access || access.expiresAt < new Date()) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    await this.prisma.quoteViewLog.create({
      data: { tokenId: access.id },
    });

    const q = access.quote;
    return {
      organizationName: q.organization.name,
      customerName: q.serviceOrder.vehicle.customer.name,
      vehicle: {
        plate: q.serviceOrder.vehicle.plate,
        brand: q.serviceOrder.vehicle.brand,
        model: q.serviceOrder.vehicle.model,
      },
      quote: this.mapQuoteResponse({
        ...q,
        serviceOrder: {
          ...q.serviceOrder,
          customerVisibleNotes: q.serviceOrder.customerVisibleNotes,
        },
      }),
      attachments: await this.mapPortalAttachments(q.serviceOrder.attachments),
    };
  }

  async approvePublicQuote(token: string, dto?: ApproveLinesDto) {
    const access = await this.prisma.quoteAccessToken.findUnique({
      where: { token },
      include: { quote: { include: { serviceOrder: true } } },
    });
    if (!access || access.expiresAt < new Date()) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const ctx = {
      organizationId: access.organizationId,
      vehicleId: access.quote.serviceOrder.vehicleId,
    };

    return this.approveQuote(ctx, access.quoteId, dto);
  }

  async rejectPublicQuote(token: string, comment?: string) {
    const access = await this.prisma.quoteAccessToken.findUnique({
      where: { token },
      include: { quote: true },
    });
    if (!access || access.expiresAt < new Date()) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    return this.rejectQuote(null, access.quoteId, comment, { byToken: true });
  }

  async listNotifications(
    ctx: { organizationId: string; vehicleId: string },
    unreadOnly?: boolean,
  ) {
    const rows = await this.prisma.portalNotification.findMany({
      where: {
        organizationId: ctx.organizationId,
        vehicleId: ctx.vehicleId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt != null,
      serviceOrderId: n.serviceOrderId,
      quoteId: n.quoteId,
      createdAt: n.createdAt,
    }));
  }

  async markNotificationRead(ctx: { organizationId: string; vehicleId: string }, id: string) {
    await this.prisma.portalNotification.updateMany({
      where: { id, organizationId: ctx.organizationId, vehicleId: ctx.vehicleId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllNotificationsRead(ctx: { organizationId: string; vehicleId: string }) {
    await this.prisma.portalNotification.updateMany({
      where: { organizationId: ctx.organizationId, vehicleId: ctx.vehicleId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async listVehicles(ctx: { organizationId: string; customerId: string }) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      color: v.color,
      currentKm: v.currentKm,
      vehicleKind: v.vehicleKind,
    }));
  }

  async switchVehicle(ctx: {
    organizationId: string;
    customerId: string;
    vehicleId: string;
  }, targetVehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: targetVehicleId,
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
        deletedAt: null,
      },
      include: { customer: true, organization: true },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const payload = {
      portal: true as const,
      organizationId: vehicle.organizationId,
      customerId: vehicle.customerId,
      vehicleId: vehicle.id,
    };
    return this.buildPortalSession(
      vehicle.organization.name,
      vehicle.customer.name,
      vehicle.plate,
      payload,
    );
  }

  async registerFcmToken(
    ctx: { organizationId: string; vehicleId: string },
    body: { token: string; platform?: string },
  ) {
    await this.push.saveFcmToken(ctx.organizationId, ctx.vehicleId, body.token, body.platform ?? 'android');
    return { ok: true };
  }

  async getPushStatus(ctx: { vehicleId: string }) {
    const tokens = await this.prisma.fcmToken.count({ where: { vehicleId: ctx.vehicleId } });
    return {
      ok: true,
      fcmTokens: tokens,
      pushReady: tokens > 0,
    };
  }
}
