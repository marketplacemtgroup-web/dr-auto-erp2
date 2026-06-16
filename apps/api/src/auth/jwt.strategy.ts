import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  memberId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'autocore-dev-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: payload.memberId,
        userId: payload.sub,
        organizationId: payload.organizationId,
        isActive: true,
      },
      include: {
        user: true,
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!member || !member.user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      avatarUrl: member.user.avatarUrl,
      organizationId: member.organizationId,
      organizationName: member.organization.name,
      branchId: member.branchId,
      memberId: member.id,
      role: member.role.slug,
      permissions: member.role.permissions.map((rp) => rp.permission.slug),
    };
  }
}
