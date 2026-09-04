import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RolesService } from './roles.service';

/** Garante permissões de sistema e perfis padrão ao subir a API (idempotente). */
@Injectable()
export class RolesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RolesBootstrapService.name);

  constructor(private readonly roles: RolesService) {}

  onModuleInit() {
    // Atrasa o sync para não competir com a 1ª onda de GETs no cold start
    // (connection_limit=1 → RolesBootstrap + financeiro em paralelo = P2024).
    setTimeout(() => void this.syncInBackground(), 8_000);
  }

  private async syncInBackground() {
    try {
      const result = await this.roles.syncAllDefaultRoles();
      this.logger.log(
        `Bootstrap de perfis concluído (${result.organizations} organização(ões)).`,
      );
    } catch (err) {
      this.logger.error('Falha ao sincronizar perfis padrão na inicialização', err);
    }
  }
}
