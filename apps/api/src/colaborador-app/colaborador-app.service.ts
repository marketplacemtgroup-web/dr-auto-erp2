import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GeneratedCommissionStatus, ServiceOrderStatus } from '@prisma/client';
import { EscalasService } from '../escalas/escalas.service';
import { PontoService } from '../ponto/ponto.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, EmployeeScopeService } from '../shared/employee-scope.service';
import { formatTimeHHmm, toDateOnlyStr } from '../shared/time-clock.utils';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { EmployeesService } from '../team/employees.service';
import {
  describeCommissionRule,
  employeeParticipationWhere,
  employeeShareOfExpectedCommission,
  itemBelongsToEmployee,
  mapCommissionStatusToApp,
  mapOsStatusToApp,
  monthRangeUtc,
  OS_FINISHED,
  OS_IN_PROGRESS,
  todayRangeUtc,
} from './colaborador-app.helpers';

const EMPLOYEE_PHOTOS_BUCKET = 'documents';

@Injectable()
export class ColaboradorAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: EmployeeScopeService,
    private readonly ponto: PontoService,
    private readonly escalas: EscalasService,
    private readonly employees: EmployeesService,
    private readonly storage: SupabaseStorageService,
  ) {}

  private async requireEmployee(user: AuthUser) {
    const employeeId = await this.scope.resolveEmployeeId(
      user.organizationId,
      user.memberId,
    );
    if (!employeeId) {
      throw new ForbiddenException(
        'Usuário sem vínculo com funcionário. Peça ao gestor para vincular seu acesso.',
      );
    }
    return this.scope.requireActiveEmployee(user.organizationId, employeeId);
  }

  private previewItemsWhere(organizationId: string, employeeId: string) {
    return {
      organizationId,
      expectedCommission: { gt: 0 },
      serviceOrder: { deletedAt: null, status: { in: OS_IN_PROGRESS } },
      OR: [
        { executorId: employeeId },
        { coExecutorId: employeeId },
        { soldById: employeeId },
        {
          itemType: 'SERVICE' as const,
          executorId: null,
          serviceOrder: { executionById: employeeId },
        },
      ],
    };
  }

  private async loadPreviewCommissionItems(organizationId: string, employeeId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: this.previewItemsWhere(organizationId, employeeId),
      include: {
        serviceOrder: { select: { id: true, number: true, executionById: true } },
      },
    });
    return items.filter((item) =>
      itemBelongsToEmployee(item, item.serviceOrder, employeeId),
    );
  }

  private sumEmployeePreviewCommission(
    items: Array<{
      expectedCommission: unknown;
      executorId: string | null;
      coExecutorId: string | null;
      coExecutorSplitPct: number | null;
      serviceOrder: { executionById: string | null };
    }>,
    employeeId: string,
  ) {
    return items.reduce(
      (sum, item) =>
        sum + employeeShareOfExpectedCommission(item, item.serviceOrder, employeeId),
      0,
    );
  }

  async getMe(user: AuthUser) {
    const employee = await this.requireEmployee(user);
    const rules = await this.prisma.employeeCommissionRule.findMany({
      where: { organizationId: user.organizationId, employeeId: employee.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let photoUrl = employee.photoUrl;
    if (photoUrl && !photoUrl.startsWith('http')) {
      try {
        photoUrl = await this.storage.createSignedUrl(EMPLOYEE_PHOTOS_BUCKET, photoUrl);
      } catch {
        /* mantém path */
      }
    }

    return {
      id: employee.id,
      nome: employee.name,
      cargo: employee.jobTitle?.name ?? employee.accessProfile ?? 'Colaborador',
      cpf: employee.cpf,
      rg: employee.rg,
      address: employee.address,
      phone: employee.phone ?? employee.whatsapp,
      email: employee.email,
      birthDate: employee.birthDate?.toISOString().slice(0, 10) ?? null,
      hireDate: employee.hireDate?.toISOString().slice(0, 10) ?? null,
      photoUrl,
      jobTitle: employee.jobTitle?.name ?? null,
      regras_comissao: rules.map((r) => ({
        ruleType: r.ruleType,
        baseCalculation: r.baseCalculation,
        percentage: r.percentage != null ? Number(r.percentage) : null,
        fixedAmount: r.fixedAmount != null ? Number(r.fixedAmount) : null,
        description: describeCommissionRule(r),
      })),
    };
  }

  async uploadPhoto(
    user: AuthUser,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const employee = await this.requireEmployee(user);
    const ext = file.mimetype.includes('png') ? 'png' : 'jpg';
    const storagePath = `employee-photos/${user.organizationId}/${employee.id}/photo.${ext}`;

    if (employee.photoUrl && !employee.photoUrl.startsWith('http')) {
      try {
        await this.storage.remove(EMPLOYEE_PHOTOS_BUCKET, employee.photoUrl);
      } catch {
        /* ignore */
      }
    }

    await this.storage.upload(
      EMPLOYEE_PHOTOS_BUCKET,
      storagePath,
      file.buffer,
      file.mimetype,
      true,
    );

    const photoUrl = storagePath;

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { photoUrl },
    });

    return { photoUrl: await this.storage.createSignedUrl(EMPLOYEE_PHOTOS_BUCKET, photoUrl).catch(() => photoUrl) };
  }

  async getDashboard(user: AuthUser) {
    const employee = await this.requireEmployee(user);
    const { start: monthStart, end: monthEnd } = monthRangeUtc();
    const { start: todayStart, end: todayEnd, startStr: todayStr } = todayRangeUtc();

    const participation = employeeParticipationWhere(employee.id);

    const [
      osOficinaHoje,
      osMinhasExecucao,
      osProduzidasMes,
      previewItems,
      pendenteAgg,
      aprovadaAgg,
      pagaMesAgg,
      comissaoHojeAgg,
      pontoDays,
      nextSchedule,
      rules,
    ] = await Promise.all([
      this.prisma.serviceOrder.count({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          status: { in: OS_IN_PROGRESS },
          ...participation,
        },
      }),
      this.prisma.serviceOrder.count({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          status: { in: OS_FINISHED },
          updatedAt: { gte: monthStart, lte: monthEnd },
          ...participation,
        },
      }),
      this.loadPreviewCommissionItems(user.organizationId, employee.id),
      this.prisma.generatedCommission.aggregate({
        where: { organizationId: user.organizationId, employeeId: employee.id, status: 'PENDENTE' },
        _sum: { commissionAmount: true },
      }),
      this.prisma.generatedCommission.aggregate({
        where: {
          organizationId: user.organizationId,
          employeeId: employee.id,
          status: 'APROVADA',
          generatedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.generatedCommission.aggregate({
        where: {
          organizationId: user.organizationId,
          employeeId: employee.id,
          status: 'PAGA',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.generatedCommission.aggregate({
        where: {
          organizationId: user.organizationId,
          employeeId: employee.id,
          generatedAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { commissionAmount: true },
      }),
      this.ponto.getHoje(user.organizationId, user, todayStr),
      this.escalas.minhaEscala(user.organizationId, user, todayStr, todayStr),
      this.prisma.employeeCommissionRule.findMany({
        where: { organizationId: user.organizationId, employeeId: employee.id, isActive: true },
      }),
    ]);

    const comissaoPrevista = this.sumEmployeePreviewCommission(previewItems, employee.id);
    const comissaoPendente = Number(pendenteAgg._sum.commissionAmount ?? 0);
    const comissaoAprovada = Number(aprovadaAgg._sum.commissionAmount ?? 0);
    const comissaoPagaMes = Number(pagaMesAgg._sum.commissionAmount ?? 0);
    const comissaoHoje = Number(comissaoHojeAgg._sum.commissionAmount ?? 0);
    const comissaoMesAReceber = comissaoPendente + comissaoAprovada;

    const day = pontoDays[0];
    const proximoTurno =
      nextSchedule.length > 0
        ? {
            data: nextSchedule[0].scheduleDate.toISOString().slice(0, 10),
            inicio: nextSchedule[0].startTime?.slice(0, 5) ?? '',
            fim: nextSchedule[0].endTime?.slice(0, 5) ?? '',
          }
        : null;

    return {
      funcionario: {
        id: employee.id,
        nome: employee.name,
        cargo: employee.jobTitle?.name ?? 'Colaborador',
      },
      resumo: {
        os_oficina_hoje: osOficinaHoje,
        os_minhas_em_execucao: osMinhasExecucao,
        os_produzidas_mes: osProduzidasMes,
        os_atribuidas_hoje: osMinhasExecucao,
        os_em_execucao: osMinhasExecucao,
        comissao_prevista: comissaoPrevista,
        comissao_prevista_mes: comissaoPrevista,
        comissao_mes_a_receber: comissaoMesAReceber,
        comissao_hoje: comissaoHoje,
        comissao_paga_mes: comissaoPagaMes,
        comissao_pendente: comissaoPendente,
        comissao_aprovada_mes: comissaoAprovada,
        proximo_turno: proximoTurno,
        ponto_hoje: day
          ? {
              entrada: formatTimeHHmm(day.clockIn),
              intervalo_inicio: formatTimeHHmm(day.breakStart),
              intervalo_fim: formatTimeHHmm(day.breakEnd),
              saíde: formatTimeHHmm(day.clockOut),
              status: day.status,
            }
          : null,
      },
      regras_comissao: rules.map((r) => ({
        ruleType: r.ruleType,
        percentage: r.percentage != null ? Number(r.percentage) : null,
        fixedAmount: r.fixedAmount != null ? Number(r.fixedAmount) : null,
        description: describeCommissionRule(r),
      })),
      avisos: [],
    };
  }

  async listMyOrders(
    user: AuthUser,
    filters?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const employee = await this.requireEmployee(user);
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const statusFilter = this.mapAppStatusFilter(filters?.status);

    const participation = employeeParticipationWhere(employee.id);
    const andClauses: object[] = [participation];
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      const or: object[] = [
        { vehicle: { plate: { contains: q, mode: 'insensitive' } } },
        { vehicle: { customer: { name: { contains: q, mode: 'insensitive' } } } },
      ];
      const num = Number(q.replace(/\D/g, ''));
      if (!Number.isNaN(num) && num > 0) or.push({ number: num });
      andClauses.push({ OR: or });
    }

    const where = {
      organizationId: user.organizationId,
      deletedAt: null,
      AND: andClauses,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.findMany({
        where,
        include: {
          vehicle: { include: { customer: true } },
          items: {
            where: {
              OR: [
                { executorId: employee.id },
                { coExecutorId: employee.id },
                { soldById: employee.id },
                {
                  itemType: 'SERVICE',
                  executorId: null,
                  serviceOrder: { executionById: employee.id },
                },
              ],
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data = rows.map((so) => {
      const myItems = so.items.filter((i) =>
        itemBelongsToEmployee(i, { executionById: so.executionById ?? null }, employee.id),
      );
      const comissaoPrevista = myItems.reduce(
        (s, i) =>
          s +
          employeeShareOfExpectedCommission(
            i,
            { executionById: so.executionById ?? null },
            employee.id,
          ),
        0,
      );
      return {
        id: so.id,
        numero: `OS #${String(so.number).padStart(4, '0')}`,
        cliente_nome: so.vehicle.customer.name,
        veiculo_modelo: [so.vehicle.brand, so.vehicle.model].filter(Boolean).join(' '),
        placa: so.vehicle.plate,
        status: mapOsStatusToApp(so.status),
        data_abertura: so.createdAt.toISOString(),
        servicos_executados_por_mim: myItems.length,
        comissao_prevista: comissaoPrevista,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMyOrderDetail(user: AuthUser, orderId: string) {
    const employee = await this.requireEmployee(user);
    const so = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        organizationId: user.organizationId,
        deletedAt: null,
        ...employeeParticipationWhere(employee.id),
      },
      include: {
        vehicle: { include: { customer: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const myItems = so.items.filter((i) => itemBelongsToEmployee(i, so, employee.id));

    return {
      id: so.id,
      numero: `OS #${String(so.number).padStart(4, '0')}`,
      status: mapOsStatusToApp(so.status),
      cliente_nome: so.vehicle.customer.name,
      veiculo_modelo: [so.vehicle.brand, so.vehicle.model].filter(Boolean).join(' '),
      placa: so.vehicle.plate,
      km: so.entryKm ?? 0,
      responsavel_checklist: so.checklistById === employee.id,
      responsavel_diagnostico: so.diagnosisById === employee.id,
      executor_servicos:
        so.executionById === employee.id ||
        so.coExecutionById === employee.id ||
        myItems.some((i) => i.itemType === 'SERVICE'),
      servicos: myItems.map((item) => ({
        id: item.id,
        descricao: item.description,
        valor_base: Number(item.unitPrice) * item.quantity - Number(item.discount),
        regra_comissao: item.expectedCommission != null ? 'Conforme regra do funcionário' : '—',
        comissao_prevista: employeeShareOfExpectedCommission(item, so, employee.id),
        status_comissao: mapOsStatusToApp(so.status) === 'finalizada' ? 'aprovada' : 'pendente',
      })),
      historico: so.statusHistory.map((h) => ({
        data_hora: h.createdAt.toISOString(),
        descricao: h.notes ?? `Status: ${h.toStatus}`,
      })),
    };
  }

  async getCommissions(user: AuthUser, periodo?: string) {
    const employee = await this.requireEmployee(user);
    const { start, end } = periodo === 'mes_anterior'
      ? monthRangeUtc(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)))
      : monthRangeUtc();

    const [previewItems, pendenteAgg, aprovadaAgg, pagaAgg, generated] =
      await Promise.all([
        this.loadPreviewCommissionItems(user.organizationId, employee.id),
        this.prisma.generatedCommission.aggregate({
          where: { organizationId: user.organizationId, employeeId: employee.id, status: 'PENDENTE' },
          _sum: { commissionAmount: true },
        }),
        this.prisma.generatedCommission.aggregate({
          where: {
            organizationId: user.organizationId,
            employeeId: employee.id,
            status: 'APROVADA',
            generatedAt: { gte: start, lte: end },
          },
          _sum: { commissionAmount: true },
        }),
        this.prisma.generatedCommission.aggregate({
          where: {
            organizationId: user.organizationId,
            employeeId: employee.id,
            status: 'PAGA',
            paidAt: { gte: start, lte: end },
          },
          _sum: { commissionAmount: true },
        }),
        this.prisma.generatedCommission.findMany({
          where: {
            organizationId: user.organizationId,
            employeeId: employee.id,
            generatedAt: { gte: start, lte: end },
          },
          include: { serviceOrder: { select: { number: true } } },
          orderBy: { generatedAt: 'desc' },
        }),
      ]);

    const resumo = {
      prevista: this.sumEmployeePreviewCommission(previewItems, employee.id),
      pendente: Number(pendenteAgg._sum.commissionAmount ?? 0),
      aprovada: Number(aprovadaAgg._sum.commissionAmount ?? 0),
      paga: Number(pagaAgg._sum.commissionAmount ?? 0),
    };

    const generatedRows = generated.map((c) => this.mapCommissionRow(c));
    const previewRows = previewItems.map((item) => ({
      id: `prev_${item.id}`,
      os_numero: item.serviceOrder
        ? `OS #${String(item.serviceOrder.number).padStart(4, '0')}`
        : '—',
      descricao: item.description,
      tipo: item.itemType === 'PART' ? 'peca' : 'servico',
      base_valor: Number(item.unitPrice) * item.quantity - Number(item.discount),
      regra: 'Comissão prevista (OS em execução)',
      valor_comissao: employeeShareOfExpectedCommission(
        item,
        item.serviceOrder,
        employee.id,
      ),
      status: 'prevista' as const,
      data_geracao: item.updatedAt.toISOString(),
      previsao_pagamento: null,
      data_pagamento: null,
      observacao: 'Valor estimado enquanto a OS estiver em execução.',
      percentual: null,
    }));

    return {
      resumo,
      data: [...previewRows, ...generatedRows],
    };
  }

  async getCommissionDetail(user: AuthUser, id: string) {
    const employee = await this.requireEmployee(user);
    if (id.startsWith('prev_')) {
      const itemId = id.replace('prev_', '');
      const item = await this.prisma.serviceOrderItem.findFirst({
        where: {
          id: itemId,
          organizationId: user.organizationId,
        },
        include: {
          serviceOrder: { select: { number: true, executionById: true } },
        },
      });
      if (
        !item ||
        !itemBelongsToEmployee(item, item.serviceOrder, employee.id)
      ) {
        throw new NotFoundException('Comissão não encontrada');
      }
      return {
        id,
        os_numero: item.serviceOrder
          ? `OS #${String(item.serviceOrder.number).padStart(4, '0')}`
          : '—',
        descricao: item.description,
        tipo: 'servico',
        base_valor: Number(item.unitPrice) * item.quantity - Number(item.discount),
        regra: 'Comissão prevista (OS em execução)',
        valor_comissao: employeeShareOfExpectedCommission(
          item,
          item.serviceOrder,
          employee.id,
        ),
        status: 'prevista',
        data_geracao: item.updatedAt.toISOString(),
        previsao_pagamento: null,
        data_pagamento: null,
        observacao: 'Valor estimado enquanto a OS estiver em execução.',
        percentual: null,
      };
    }

    const row = await this.prisma.generatedCommission.findFirst({
      where: { id, organizationId: user.organizationId, employeeId: employee.id },
      include: { serviceOrder: { select: { number: true } } },
    });
    if (!row) throw new NotFoundException('Comissão não encontrada');
    return this.mapCommissionRow(row);
  }

  async getDesempenho(user: AuthUser, periodo?: string) {
    const employee = await this.requireEmployee(user);
    const { startStr, endStr, start, end } = monthRangeUtc();

    const productivity = await this.employees.productivity(
      user.organizationId,
      startStr,
      endStr,
      employee.id,
    );
    const row = productivity[0];

    const weekly: { semana: string; os: number; servicos: number; comissao: number }[] = [];
    const cursor = new Date(start);
    let weekIndex = 1;
    while (cursor <= end) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor);
      wEnd.setUTCDate(wEnd.getUTCDate() + 6);
      if (wEnd > end) wEnd.setTime(end.getTime());

      const [osW, servW, comW] = await Promise.all([
        this.prisma.serviceOrder.count({
          where: {
            organizationId: user.organizationId,
            deletedAt: null,
            status: { in: OS_FINISHED },
            finalizedById: employee.id,
            updatedAt: { gte: wStart, lte: wEnd },
          },
        }),
        this.prisma.serviceOrderItem.count({
          where: {
            organizationId: user.organizationId,
            OR: [{ executorId: employee.id }, { coExecutorId: employee.id }],
            createdAt: { gte: wStart, lte: wEnd },
          },
        }),
        this.prisma.generatedCommission.aggregate({
          where: {
            organizationId: user.organizationId,
            employeeId: employee.id,
            generatedAt: { gte: wStart, lte: wEnd },
          },
          _sum: { commissionAmount: true },
        }),
      ]);

      weekly.push({
        semana: `Sem ${weekIndex}`,
        os: osW,
        servicos: servW,
        comissao: Number(comW._sum.commissionAmount ?? 0),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      weekIndex += 1;
    }

    const osFinished = row?.osFinished ?? 0;
    const servicesExecuted = row?.servicesExecuted ?? 0;
    const commissionsGenerated = row?.commissionsGenerated ?? 0;

    return {
      periodo: periodo ?? 'mes_atual',
      os_finalizadas: osFinished,
      servicos_executados: servicesExecuted,
      checklists_realizados: 0,
      fotos_enviadas: 0,
      comissao_gerada: commissionsGenerated,
      tempo_medio_os: '—',
      series_semanal: weekly,
      metas: [
        { titulo: 'OS finalizadas', atual: osFinished, meta: Math.max(osFinished + 5, 10) },
        { titulo: 'Serviços executados', atual: servicesExecuted, meta: Math.max(servicesExecuted + 10, 20) },
        { titulo: 'Comissão gerada (R$)', atual: Math.round(commissionsGenerated), meta: Math.max(Math.round(commissionsGenerated * 1.2), 100) },
      ],
    };
  }

  async listDocuments(user: AuthUser) {
    const employee = await this.requireEmployee(user);
    const docs = await this.prisma.employeeDocument.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      docs.map(async (d) => {
        let url = d.fileUrl;
        if (url && !url.startsWith('http')) {
          try {
            url = await this.storage.createSignedUrl('documents', url);
          } catch {
            /* keep */
          }
        }
        return {
          id: d.id,
          nome: d.fileName,
          tipo: d.docType,
          data: d.createdAt.toISOString().slice(0, 10).split('-').reverse().join('/'),
          url,
          tamanho: '—',
        };
      }),
    );
  }

  private mapCommissionRow(c: {
    id: string;
    description: string;
    itemType: string;
    baseAmount: unknown;
    percentage: unknown;
    commissionAmount: unknown;
    status: GeneratedCommissionStatus;
    generatedAt: Date;
    paidAt: Date | null;
    serviceOrder?: { number: number } | null;
  }) {
    const pct = c.percentage != null ? Number(c.percentage) : null;
    return {
      id: c.id,
      os_numero: c.serviceOrder ? `OS #${String(c.serviceOrder.number).padStart(4, '0')}` : '—',
      descricao: c.description,
      tipo: c.itemType === 'PECA' ? 'peca' : c.itemType === 'OS' ? 'os' : 'servico',
      base_valor: Number(c.baseAmount),
      regra: pct != null ? `${pct}% sobre base` : 'Valor fixo / regra',
      valor_comissao: Number(c.commissionAmount),
      status: mapCommissionStatusToApp(c.status),
      data_geracao: c.generatedAt.toISOString(),
      previsao_pagamento: null,
      data_pagamento: c.paidAt?.toISOString().slice(0, 10) ?? null,
      observacao: null,
      percentual: pct != null ? Math.round(pct) : null,
    };
  }

  private mapAppStatusFilter(status?: string): ServiceOrderStatus[] | null {
    if (!status) return null;
    switch (status.toLowerCase()) {
      case 'em_execucao':
        return OS_IN_PROGRESS;
      case 'finalizada':
        return OS_FINISHED;
      case 'aguardando_aprovacao':
        return ['RECEIVED'];
      case 'cancelada':
        return ['CANCELLED'];
      default:
        return null;
    }
  }
}
