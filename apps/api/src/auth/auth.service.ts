import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildLoginEmail,
  normalizeLoginEmailDomain,
  suggestLoginEmailDomain,
} from './login-email.util';
import { LoginDto } from './dto/login.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getSetupStatus() {
    const count = await this.prisma.organization.count();
    return {
      hasOrganization: count > 0,
      singleTenant: this.config.get('SINGLE_TENANT', 'true') === 'true',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!member) {
      throw new UnauthorizedException('Usuário sem organização vinculada');
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: member.organizationId,
        userId: user.id,
        action: 'login',
        resource: 'auth',
      },
    });

    return this.buildSession(user, member);
  }

  async registerOrganization(dto: RegisterOrganizationDto, logo?: Express.Multer.File) {
    const singleTenant = this.config.get('SINGLE_TENANT', 'true') === 'true';
    if (singleTenant) {
      const orgCount = await this.prisma.organization.count();
      if (orgCount >= 1) {
        throw new ConflictException(
          'Esta instalação já está configurada. Use o login.',
        );
      }
    }

    const defaultOrgName =
      this.config.get<string>('DEFAULT_ORGANIZATION_NAME') ?? 'WTEC Motors';
    const organizationName = dto.organizationName?.trim() || defaultOrgName;

    const loginEmailDomain =
      normalizeLoginEmailDomain(dto.loginEmailDomain) ||
      suggestLoginEmailDomain(organizationName);
    const email = buildLoginEmail(dto.loginUsername, loginEmailDomain);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Usuário de login já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const permissions = await this.prisma.permission.findMany();
    const permIds = permissions.map((p) => p.id);

    const result = await this.prisma.$transaction(
      async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          tradeName: dto.tradeName ?? 'WTEC Motors',
          document: dto.document,
          email,
          loginEmailDomain,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: 'Matriz',
          code: 'MTZ',
          isMain: true,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          organizationId: org.id,
          slug: 'admin',
          name: 'Administrador',
          isSystem: true,
          permissions: {
            create: permIds.map((permissionId) => ({ permissionId })),
          },
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name,
        },
      });

      await tx.profile.create({
        data: { id: user.id, userId: user.id, phone: dto.phone },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          roleId: adminRole.id,
          branchId: branch.id,
        },
      });

      return { memberId: member.id, organizationId: org.id };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    if (logo) {
      await this.organizationsService.uploadLogo(result.organizationId, logo);
    }

    const member = await this.prisma.organizationMember.findFirstOrThrow({
      where: { id: result.memberId },
      include: {
        user: true,
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    return this.buildSession(member.user, member);
  }

  async me(userId: string, organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, userId, organizationId, isActive: true },
      include: {
        user: true,
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!member) throw new UnauthorizedException();
    return this.buildSession(member.user, member);
  }

  private buildSession(
    user: { id: string; email: string; name: string; avatarUrl: string | null },
    member: {
      id: string;
      organizationId: string;
      branchId: string | null;
      organization: { name: string };
      role: { slug: string; permissions: { permission: { slug: string } }[] };
    },
  ) {
    const permissions = member.role.permissions.map((rp) => rp.permission.slug);
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: member.organizationId,
      memberId: member.id,
      role: member.role.slug,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organizationId: member.organizationId,
      organizationName: member.organization.name,
      branchId: member.branchId,
      role: member.role.slug,
      permissions,
    };
  }
}
