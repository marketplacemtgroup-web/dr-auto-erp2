import {
  Injectable,
  Logger,
  BadRequestException,
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
import { AppointmentsService } from '../appointments/appointments.service';
import {
  CAR_CHECKLIST_TEMPLATE,
  checklistMatchesTemplate,
} from '../service-orders/checklist-template';
import { notDeleted } from '../common/soft-delete';
import { PortalCreateAppointmentDto } from './dto/portal-create-appointment.dto';

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
    private readonly appointments: AppointmentsService,
  ) {}

  private async mapPortalAttachments(
    rows: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      entityType: AttachmentEntityType;
      storagePath: string;
      category?: string | null;
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
          category: a.category ?? null,
          createdAt: a.createdAt,
        };
      }),
    );
  }

  /** Sincroniza checklist legado (lista longa) com o template atual de 12 itens. */
  private async ensureChecklistTemplate(organizationId: string, serviceOrderId: string) {
    const items = await this.prisma.serviceOrderChecklistItem.findMany({
      where: { serviceOrderId, organizationId },
      orderBy: { sortOrder: 'asc' },
      select: { label: true },
    });
    const needsSync =
      items.length === 0 ||
      !checklistMatchesTemplate(items.map((item) => item.label));
    if (!needsSync) return;

    await this.prisma.serviceOrderChecklistItem.deleteMany({
      where: { serviceOrderId, organizationId },
    });
    await this.prisma.serviceOrderChecklistItem.createMany({
      data: CAR_CHECKLIST_TEMPLATE.map((item, idx) => ({
        organizationId,
        serviceOrderId,
        category: item.category,
        label: item.label,
        sortOrder: idx,
      })),
    });
  }

  /** Mesmo slug usado no app Android (ApiMappers.checklistCategorySlug). */
  private checklistCategorySlug(label: string): string {
    return `checklist-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  }

  private async buildPortalPhotoGallery(
    checklistItems: Array<{
      label: string;
      sortOrder: number;
      result: string | null;
      notes: string | null;
    }>,
    attachments: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      entityType: AttachmentEntityType;
      storagePath: string;
      category?: string | null;
      createdAt?: Date;
    }>,
  ) {
    const mappedAttachments = await this.mapPortalAttachments(attachments);
    const photoByCategory = new Map<
      string,
      (typeof mappedAttachments)[number]
    >();
    for (const attachment of mappedAttachments) {
      if (attachment.category?.startsWith('checklist-') && attachment.url) {
        photoByCategory.set(attachment.category, attachment);
      }
    }

    const usedAttachmentIds = new Set<string>();
    const gallery: Array<{
      order: number;
      label: string;
      description: string | null;
      result: string | null;
      url: string;
      mimeType: string;
      source: 'checklist' | 'media';
      createdAt: string;
    }> = [];

    let order = 1;
    for (const item of [...checklistItems].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const slug = this.checklistCategorySlug(item.label);
      const photo = photoByCategory.get(slug);
      if (!photo?.url) continue;
      usedAttachmentIds.add(photo.id);
      gallery.push({
        order: order++,
        label: item.label,
        description: item.notes ?? photo.fileName ?? null,
        result: item.result,
        url: photo.url,
        mimeType: photo.mimeType,
        source: 'checklist',
        createdAt: (photo.createdAt ?? new Date()).toISOString(),
      });
    }

    const mediaAttachments = mappedAttachments
      .filter(
        (attachment) =>
          !attachment.category?.startsWith('checklist-') &&
          !usedAttachmentIds.has(attachment.id) &&
          attachment.url,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      );

    for (const attachment of mediaAttachments) {
      gallery.push({
        order: order++,
        label: attachment.fileName,
        description: null,
        result: null,
        url: attachment.url,
        mimeType: attachment.mimeType,
        source: 'media',
        createdAt: (attachment.createdAt ?? new Date()).toISOString(),
      });
    }

    return gallery;
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

    const [quotes, serviceOrders, mainBranch, upcomingAppointments, maintenanceReminders] =
      await Promise.all([
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
      this.prisma.appointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          vehicleId: ctx.vehicleId,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 1,
      }),
      this.prisma.maintenanceReminder.findMany({
        where: {
          organizationId: ctx.organizationId,
          vehicleId: ctx.vehicleId,
          status: 'ACTIVE',
        },
        include: {
          serviceOrder: { select: { id: true, number: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { dueKm: 'asc' }],
        take: 5,
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
      upcomingAppointment: upcomingAppointments[0]
        ? {
            id: upcomingAppointments[0].id,
            scheduledAt: upcomingAppointments[0].scheduledAt,
            status: upcomingAppointments[0].status,
            durationMinutes: upcomingAppointments[0].durationMinutes,
          }
        : null,
      maintenanceReminders: maintenanceReminders.map((r) => ({
        id: r.id,
        type: r.type,
        dueKm: r.dueKm,
        dueDate: r.dueDate,
        serviceOrderNumber: r.serviceOrder.number,
        serviceOrderId: r.serviceOrder.id,
      })),
    };
  }

  async getServiceOrderForPortal(
    ctx: { organizationId: string; vehicleId: string },
    serviceOrderId: string,
  ) {
    await this.ensureChecklistTemplate(ctx.organizationId, serviceOrderId);

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
          where: {
            OR: [
              { visibleToCustomer: true },
              { category: { startsWith: 'checklist-' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
        checklistItems: { orderBy: { sortOrder: 'asc' } },
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
      discount: Number(item.discount),
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

    const mappedAttachments = await this.mapPortalAttachments(so.attachments);
    const photoByCategory = new Map<
      string,
      { url: string; mimeType: string }
    >();
    for (const a of mappedAttachments) {
      if (a.category?.startsWith('checklist-') && a.url) {
        photoByCategory.set(a.category, { url: a.url, mimeType: a.mimeType });
      }
    }

    const checklistItems = so.checklistItems.map((item) => {
      const slug = this.checklistCategorySlug(item.label);
      const photo = photoByCategory.get(slug);
      return {
        id: item.id,
        category: item.category,
        label: item.label,
        result: item.result,
        notes: item.notes,
        photoUrl: photo?.url ?? null,
        photoMimeType: photo?.mimeType ?? null,
      };
    });

    const photos = await this.buildPortalPhotoGallery(so.checklistItems, so.attachments);

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
      checklistItems,
      photos,
      attachments: mappedAttachments,
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

    const hasApprovedLines = lines.some((l) => l.approved === true);
    const pendingLines = lines.filter((l) => l.approved === null);
    const isSupplement = hasApprovedLines && pendingLines.length > 0;

    return {
      id: q.id,
      number: q.number,
      status: q.status,
      amount: Number(q.amount),
      validUntil: q.validUntil,
      terms: q.terms,
      createdAt: q.createdAt,
      lines,
      isSupplement,
      pendingLineCount: pendingLines.length,
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
      canRespond: q.status === 'PENDING' && pendingLines.length > 0,
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

  async getQuoteForPortal(
    ctx: { organizationId: string; vehicleId: string },
    quoteId: string,
  ) {
    try {
      await this.quotesSync.syncForVehicle(ctx.organizationId, ctx.vehicleId);
    } catch (err) {
      this.logger.warn(
        `Sincronização de orçamentos ignorada: ${err instanceof Error ? err.message : err}`,
      );
    }

    const row = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
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
            checklistItems: { orderBy: { sortOrder: 'asc' } },
            attachments: {
              where: {
                OR: [
                  { visibleToCustomer: true },
                  { category: { startsWith: 'checklist-' } },
                ],
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Orçamento não encontrado');
    const photos = await this.buildPortalPhotoGallery(
      row.serviceOrder.checklistItems,
      row.serviceOrder.attachments,
    );
    return { ...this.mapQuoteResponse(row), photos };
  }

  private lineTotal(line: {
    unitPrice: Prisma.Decimal;
    quantity: number;
    discount: Prisma.Decimal;
  }) {
    return Number(line.unitPrice) * line.quantity - Number(line.discount);
  }

  private async removeRejectedSupplementItems(
    organizationId: string,
    serviceOrderId: string,
    quoteId: string,
  ) {
    const rejected = await this.prisma.quoteLine.findMany({
      where: { quoteId, approved: false, serviceOrderItemId: { not: null } },
    });
    for (const line of rejected) {
      if (!line.serviceOrderItemId) continue;
      const item = await this.prisma.serviceOrderItem.findFirst({
        where: { id: line.serviceOrderItemId, serviceOrderId, organizationId },
      });
      if (!item) continue;
      await this.prisma.serviceOrderItem.delete({ where: { id: item.id } });
    }
    await this.prisma.quoteLine.deleteMany({
      where: { quoteId, approved: false },
    });
  }

  private async applyLineApprovals(
    quoteId: string,
    serviceOrderId: string,
    dto?: ApproveLinesDto,
    opts?: { priorLines?: Array<{ id: string; approved: boolean | null }> },
  ) {
    const priorApproved = (opts?.priorLines ?? []).some((l) => l.approved === true);

    if (!dto?.lines?.length) {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId, approved: null },
        data: { approved: true },
      });
      if (!(await this.prisma.quoteLine.count({ where: { quoteId, approved: null } }))) {
        await this.prisma.quoteLine.updateMany({
          where: { quoteId },
          data: { approved: true },
        });
      }
    } else {
      for (const line of dto.lines) {
        const existing = await this.prisma.quoteLine.findFirst({
          where: { id: line.lineId, quoteId },
        });
        if (!existing || existing.approved !== null) continue;
        await this.prisma.quoteLine.update({
          where: { id: line.lineId },
          data: { approved: line.approved },
        });
      }
    }

    const lines = await this.prisma.quoteLine.findMany({ where: { quoteId } });
    const pendingLines = lines.filter((l) => l.approved === null);
    const approvedLines = lines.filter((l) => l.approved === true);
    const rejectedLines = lines.filter((l) => l.approved === false);

    const approvedAmount = approvedLines.reduce(
      (sum, l) => sum + this.lineTotal(l),
      0,
    );

    const allApproved =
      lines.length > 0 && pendingLines.length === 0 && rejectedLines.length === 0;
    const allPendingRejected =
      priorApproved &&
      pendingLines.length === 0 &&
      rejectedLines.length > 0 &&
      approvedLines.length > 0;
    const allRejected = lines.length > 0 && approvedLines.length === 0;

    return {
      allApproved,
      allRejected: allRejected || allPendingRejected,
      supplementRejectOnly: allPendingRejected,
      approvedAmount,
      priorApproved,
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

    const { allApproved, allRejected, supplementRejectOnly, approvedAmount, priorApproved } =
      await this.applyLineApprovals(quote.id, quote.serviceOrderId, dto, {
        priorLines: quote.lines,
      });

    if (allRejected && supplementRejectOnly) {
      await this.removeRejectedSupplementItems(
        ctx.organizationId,
        quote.serviceOrderId,
        quote.id,
      );
      await this.quotesSync.syncQuoteLines(
        quote.id,
        quote.serviceOrderId,
        ctx.organizationId,
      );

      const updated = await this.prisma.$transaction(async (tx) => {
        const q = await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: 'APPROVED',
            amount: new Prisma.Decimal(approvedAmount),
            customerComment: dto?.comment ?? quote.customerComment,
          },
        });
        await tx.serviceOrder.update({
          where: { id: quote.serviceOrderId },
          data: {
            status: 'IN_PROGRESS',
            totalAmount: new Prisma.Decimal(approvedAmount),
          },
        });
        await tx.serviceOrderStatusHistory.create({
          data: {
            organizationId: ctx.organizationId,
            serviceOrderId: quote.serviceOrderId,
            fromStatus: quote.serviceOrder.status,
            toStatus: 'IN_PROGRESS',
            notes: 'Itens novos do complemento recusados pelo cliente',
          },
        });
        return q;
      });

      const soFull = await this.prisma.serviceOrder.findFirst({
        where: { id: quote.serviceOrderId },
        include: { vehicle: { include: { customer: true } } },
      });
      if (soFull) {
        await this.notifyQuoteRejected(ctx.organizationId, soFull.vehicleId, updated, soFull);
      }
      return this.getQuoteForPortal(ctx, quote.id);
    }

    if (allRejected) {
      return this.rejectQuote(ctx, quoteId, dto?.comment);
    }

    const linesAfter = await this.prisma.quoteLine.findMany({ where: { quoteId: quote.id } });
    const stillPending = linesAfter.some((l) => l.approved === null);
    if (stillPending) {
      throw new BadRequestException('Responda todos os itens novos antes de enviar');
    }

    if (priorApproved) {
      const rejectedNew = linesAfter.filter((l) => l.approved === false);
      if (rejectedNew.length > 0) {
        await this.removeRejectedSupplementItems(
          ctx.organizationId,
          quote.serviceOrderId,
          quote.id,
        );
        await this.quotesSync.syncQuoteLines(
          quote.id,
          quote.serviceOrderId,
          ctx.organizationId,
        );
      }
    }

    const finalLines = await this.prisma.quoteLine.findMany({ where: { quoteId: quote.id } });
    const finalApprovedAmount = finalLines
      .filter((l) => l.approved === true)
      .reduce((sum, l) => sum + this.lineTotal(l), 0);

    const osNextStatus =
      priorApproved || quote.serviceOrder.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : allApproved
          ? 'APPROVED'
          : 'IN_PROGRESS';

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: 'APPROVED',
          amount: new Prisma.Decimal(finalApprovedAmount || Number(quote.amount)),
          customerComment: dto?.comment ?? quote.customerComment,
        },
      });
      await tx.serviceOrder.update({
        where: { id: quote.serviceOrderId },
        data: {
          status: osNextStatus,
          totalAmount: new Prisma.Decimal(finalApprovedAmount || Number(quote.amount)),
        },
      });
      await tx.serviceOrderStatusHistory.create({
        data: {
          organizationId: ctx.organizationId,
          serviceOrderId: quote.serviceOrderId,
          fromStatus: quote.serviceOrder.status,
          toStatus: osNextStatus,
          notes: priorApproved
            ? 'Complemento de orçamento aprovado pelo cliente (portal)'
            : allApproved
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
      await this.notifyQuoteApproved(ctx, updated, soFull, finalApprovedAmount);
    }

    return this.getQuoteForPortal(ctx, quoteId);
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
      include: { serviceOrder: true, lines: true },
    });
    if (!quote) throw opts?.byToken ? new NotFoundException() : new UnauthorizedException();

    const hasPriorApproved = quote.lines.some((l) => l.approved === true);
    const hasPending = quote.lines.some((l) => l.approved === null);

    if (hasPriorApproved && hasPending) {
      await this.prisma.quoteLine.updateMany({
        where: { quoteId, approved: null },
        data: { approved: false },
      });
      await this.removeRejectedSupplementItems(
        quote.organizationId,
        quote.serviceOrderId,
        quoteId,
      );
      await this.quotesSync.syncQuoteLines(
        quoteId,
        quote.serviceOrderId,
        quote.organizationId,
      );

      const refreshedLines = await this.prisma.quoteLine.findMany({ where: { quoteId } });
      const approvedAmount = refreshedLines
        .filter((l) => l.approved === true)
        .reduce((sum, l) => sum + this.lineTotal(l), 0);

      const updated = await this.prisma.$transaction(async (tx) => {
        const q = await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: 'APPROVED',
            amount: new Prisma.Decimal(approvedAmount),
            customerComment: comment ?? quote.customerComment,
          },
        });
        await tx.serviceOrder.update({
          where: { id: quote.serviceOrderId },
          data: {
            status: 'IN_PROGRESS',
            totalAmount: new Prisma.Decimal(approvedAmount),
          },
        });
        await tx.serviceOrderStatusHistory.create({
          data: {
            organizationId: quote.organizationId,
            serviceOrderId: quote.serviceOrderId,
            fromStatus: quote.serviceOrder.status,
            toStatus: 'IN_PROGRESS',
            notes: 'Itens novos do complemento recusados pelo cliente',
          },
        });
        return q;
      });

      const soFull = await this.prisma.serviceOrder.findFirst({
        where: { id: quote.serviceOrderId },
        include: { vehicle: { include: { customer: true } } },
      });
      if (soFull && ctx) {
        await this.notifyQuoteRejected(ctx.organizationId, soFull.vehicleId, updated, soFull);
      }
      return this.resolveQuotePortalResponse(quote.id, ctx);
    }

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

    return this.resolveQuotePortalResponse(quote.id, ctx);
  }

  private async resolveQuotePortalResponse(
    quoteId: string,
    ctx: { organizationId: string; vehicleId: string } | null,
  ) {
    if (ctx) {
      return this.getQuoteForPortal(ctx, quoteId);
    }
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId },
      include: { serviceOrder: { select: { vehicleId: true } } },
    });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');
    return this.getQuoteForPortal(
      { organizationId: quote.organizationId, vehicleId: quote.serviceOrder.vehicleId },
      quoteId,
    );
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

  async listAppointments(ctx: { organizationId: string; vehicleId: string }) {
    return this.prisma.appointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        vehicleId: ctx.vehicleId,
        scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        durationMinutes: true,
        status: true,
        source: true,
        requestedNotes: true,
        notes: true,
      },
    });
  }

  async createAppointment(
    ctx: { organizationId: string; vehicleId: string },
    dto: PortalCreateAppointmentDto,
  ) {
    const appt = await this.appointments.create(ctx.organizationId, {
      vehicleId: ctx.vehicleId,
      scheduledAt: dto.scheduledAt,
      durationMinutes: dto.durationMinutes ?? 60,
      source: 'PORTAL',
      requestedNotes: dto.requestedNotes,
      status: 'SCHEDULED',
    });

    await this.events.emitOffice(ctx.organizationId, {
      type: 'appointment.portal',
      title: 'Novo agendamento pelo portal',
      message: `Cliente solicitou agendamento para ${new Date(dto.scheduledAt).toLocaleString('pt-BR')}`,
      metadata: { appointmentId: appt.id, vehicleId: ctx.vehicleId },
      vehicleId: ctx.vehicleId,
    });

    return appt;
  }

  async cancelAppointment(
    ctx: { organizationId: string; vehicleId: string },
    id: string,
  ) {
    const row = await this.prisma.appointment.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        vehicleId: ctx.vehicleId,
      },
    });
    if (!row) throw new NotFoundException('Agendamento não encontrado');
    if (row.serviceOrderId) {
      throw new BadRequestException('Agendamento já vinculado a uma OS');
    }
    return this.appointments.update(ctx.organizationId, id, { status: 'CANCELLED' });
  }
}
