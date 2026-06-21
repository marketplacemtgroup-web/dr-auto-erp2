import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuthUser = {
  userId: string;
  memberId: string;
  organizationId: string;
  permissions: string[];
};

@Injectable()
export class EmployeeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  hasAdminScope(permissions: string[]): boolean {
    return (
      permissions.includes('admin.access') ||
      permissions.includes('team.manage')
    );
  }

  canViewAllPonto(permissions: string[]): boolean {
    return (
      this.hasAdminScope(permissions) ||
      permissions.includes('ponto.ver_todos')
    );
  }

  canViewAllEscalas(permissions: string[]): boolean {
    return (
      this.hasAdminScope(permissions) ||
      permissions.includes('escalas.ver_todas')
    );
  }

  canViewAllSolicitacoes(permissions: string[]): boolean {
    return (
      this.hasAdminScope(permissions) ||
      permissions.includes('solicitacoes.aprovar') ||
      permissions.includes('solicitacoes.recusar')
    );
  }

  async resolveEmployeeId(
    organizationId: string,
    memberId: string,
  ): Promise<string | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { organizationId, memberId },
      select: { id: true },
    });
    return employee?.id ?? null;
  }

  async requireActiveEmployee(
    organizationId: string,
    employeeId: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { jobTitle: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new ForbiddenException('Funcionário inativo não pode usar este recurso');
    }
    return employee;
  }

  async assertCanAccessEmployee(
    user: AuthUser,
    employeeId: string,
    scope: 'ponto' | 'escalas' | 'solicitacoes',
  ) {
    const canAll =
      scope === 'ponto'
        ? this.canViewAllPonto(user.permissions)
        : scope === 'escalas'
          ? this.canViewAllEscalas(user.permissions)
          : this.canViewAllSolicitacoes(user.permissions);

    if (canAll) return;

    const ownId = await this.resolveEmployeeId(
      user.organizationId,
      user.memberId,
    );
    if (!ownId || ownId !== employeeId) {
      throw new ForbiddenException('Acesso negado a dados de outro funcionário');
    }
  }

  async resolveOwnOrRequestedEmployeeId(
    user: AuthUser,
    requestedEmployeeId: string | undefined,
    scope: 'ponto' | 'escalas' | 'solicitacoes',
  ): Promise<string> {
    if (requestedEmployeeId) {
      await this.assertCanAccessEmployee(user, requestedEmployeeId, scope);
      return requestedEmployeeId;
    }

    const ownId = await this.resolveEmployeeId(
      user.organizationId,
      user.memberId,
    );
    if (!ownId) {
      throw new ForbiddenException(
        'Usuário não vinculado a um funcionário. Informe o funcionário ou vincule seu acesso.',
      );
    }
    return ownId;
  }
}
