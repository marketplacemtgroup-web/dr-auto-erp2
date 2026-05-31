import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface PortalJwtPayload {
  portal: true;
  organizationId: string;
  customerId: string;
  vehicleId: string;
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
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

  async validate(payload: PortalJwtPayload) {
    if (!payload?.portal) throw new UnauthorizedException();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: payload.vehicleId,
        organizationId: payload.organizationId,
        customerId: payload.customerId,
      },
      include: { customer: true, organization: true },
    });

    if (!vehicle) throw new UnauthorizedException();

    return {
      portal: true,
      organizationId: payload.organizationId,
      customerId: payload.customerId,
      vehicleId: payload.vehicleId,
      customerName: vehicle.customer.name,
      plate: vehicle.plate,
      organizationName: vehicle.organization.name,
    };
  }
}

