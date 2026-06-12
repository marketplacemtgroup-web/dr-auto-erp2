import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  buildLoginEmail,
  extractLoginEmailDomain,
  suggestLoginEmailDomain,
} from '../auth/login-email.util';
import { PrismaService } from '../prisma/prisma.service';
import { TeamActionLogService } from './team-action-log.service';
import {
  ensureDefaultRoles,
  isAccessProfileSlug,
} from './default-roles';
import { CreateEmployeeAccessDto } from './dto/employee-access.dto';
import { UpdateEmployeeAccessDto } from './dto/employee-access.dto';
import { ResetEmployeePasswordDto } from './dto/employee-access.dto';

const employeeInclude = {
  jobTitle: true,
  paymentConfig: true,
  member: { include: { user: true, role: true } },
  _count: {
    select: {
      generatedCommissions: true,
      executedItems: true,
    },
  },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeeAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: TeamActionLogService,
  ) {}

  async getLoginEmailDomain(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { loginEmailDomain: true, email: true, name: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const domain =
      org.loginEmailDomain ??
      (org.email ? extractLoginEmailDomain(org.email) : null) ??
      suggestLoginEmailDomain(org.name);

    return { loginEmailDomain: domain };
  }

  private async resolveLoginEmail(organizationId: string, loginUsername: string) {
    const { loginEmailDomain } = await this.getLoginEmailDomain(organizationId);
    return buildLoginEmail(loginUsername, loginEmailDomain);
  }

  async provisionAccess(
    organizationId: string,
    employeeId: string,
    dto: CreateEmployeeAccessDto,
    actorUserId?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (employee.memberId) {
      throw new ConflictException('Este funcionário já possui acesso ao sistema');
    }
    if (!isAccessProfileSlug(dto.accessProfile)) {
      throw new BadRequestException('Perfil de acesso inválido');
    }

    await ensureDefaultRoles(this.prisma, organizationId);

    const role = await this.prisma.role.findFirst({
      where: { organizationId, slug: dto.accessProfile },
    });
    if (!role) {
      throw new BadRequestException('Perfil de acesso não encontrado na organização');
    }

    const email = await this.resolveLoginEmail(organizationId, dto.loginUsername);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Usuário de login já cadastrado');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isMain: true },
    });
    if (!branch) {
      throw new BadRequestException('Filial principal não encontrada');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const accessActive = dto.accessActive ?? true;

    const row = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: employee.name,
          isActive: accessActive,
        },
      });

      await tx.profile.create({
        data: {
          id: user.id,
          userId: user.id,
          phone: employee.phone,
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          roleId: role.id,
          branchId: branch.id,
          isActive: accessActive,
        },
      });

      return tx.employee.update({
        where: { id: employeeId },
        data: {
          memberId: member.id,
          accessProfile: dto.accessProfile,
        },
        include: employeeInclude,
      });
    });

    await this.actionLog.log(organizationId, {
      userId: actorUserId,
      employeeId,
      module: 'team',
      action: 'employee.access.create',
      entity: 'employee',
      entityId: employeeId,
      description: `Acesso ao sistema criado para ${employee.name} (${email})`,
    });

    return row;
  }

  async updateAccess(
    organizationId: string,
    employeeId: string,
    dto: UpdateEmployeeAccessDto,
    actorUserId?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { member: { include: { user: true, role: true } } },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (!employee.memberId || !employee.member) {
      throw new BadRequestException('Funcionário não possui acesso ao sistema');
    }

    if (dto.accessProfile !== undefined && !isAccessProfileSlug(dto.accessProfile)) {
      throw new BadRequestException('Perfil de acesso inválido');
    }

    if (dto.accessProfile) {
      await ensureDefaultRoles(this.prisma, organizationId);
      const role = await this.prisma.role.findFirst({
        where: { organizationId, slug: dto.accessProfile },
      });
      if (!role) {
        throw new BadRequestException('Perfil de acesso não encontrado na organização');
      }

      await this.prisma.organizationMember.update({
        where: { id: employee.memberId },
        data: { roleId: role.id },
      });
    }

    if (dto.accessActive !== undefined) {
      await this.prisma.organizationMember.update({
        where: { id: employee.memberId },
        data: { isActive: dto.accessActive },
      });
      await this.prisma.user.update({
        where: { id: employee.member.userId },
        data: { isActive: dto.accessActive },
      });
    }

    const row = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(dto.accessProfile !== undefined ? { accessProfile: dto.accessProfile } : {}),
      },
      include: employeeInclude,
    });

    await this.actionLog.log(organizationId, {
      userId: actorUserId,
      employeeId,
      module: 'team',
      action: 'employee.access.update',
      entity: 'employee',
      entityId: employeeId,
      description: `Acesso ao sistema atualizado para ${employee.name}`,
    });

    return row;
  }

  async resetPassword(
    organizationId: string,
    employeeId: string,
    dto: ResetEmployeePasswordDto,
    actorUserId?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { member: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');
    if (!employee.member) {
      throw new BadRequestException('Funcionário não possui acesso ao sistema');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: employee.member.userId },
      data: { passwordHash },
    });

    await this.actionLog.log(organizationId, {
      userId: actorUserId,
      employeeId,
      module: 'team',
      action: 'employee.access.reset_password',
      entity: 'employee',
      entityId: employeeId,
      description: `Senha redefinida para ${employee.name}`,
    });

    return { ok: true };
  }
}
