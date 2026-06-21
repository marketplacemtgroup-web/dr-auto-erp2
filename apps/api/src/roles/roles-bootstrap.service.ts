import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RolesService } from './roles.service';

/** Garante permissões de sistema e perfis padrão ao subir a API (idempotente). */
@Injectable()
export class RolesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RolesBootstrapService.name);

  constructor(private readonly roles: RolesService) {}

  onModuleInit() {
    void this.syncInBackground();
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
