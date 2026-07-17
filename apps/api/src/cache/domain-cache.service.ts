import { Injectable } from '@nestjs/common';
import { CACHE_TTL, CacheService } from './cache.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';

/** Invalidação e cache por domínio (branding, config, estoque, financeiro). */
@Injectable()
export class DomainCacheService {
  constructor(
    private readonly cache: CacheService,
    private readonly dashboardCache: DashboardCacheService,
  ) {}

  async getBranding<T>(organizationId: string, factory: () => Promise<T>): Promise<T> {
    const key = this.cache.cacheKey('branding', organizationId);
    return this.cache.getOrSet(key, CACHE_TTL.branding, factory);
  }

  async getSettings<T>(organizationId: string, factory: () => Promise<T>): Promise<T> {
    const key = this.cache.cacheKey('settings', organizationId);
    return this.cache.getOrSet(key, CACHE_TTL.config, factory);
  }

  async getInventoryList<T>(
    organizationId: string,
    cacheKeySuffix: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const key = this.cache.cacheKey('inventory', organizationId, cacheKeySuffix);
    return this.cache.getOrSet(key, CACHE_TTL.inventory, factory);
  }

  async invalidateOperational(organizationId: string) {
    await this.dashboardCache.invalidate(organizationId);
    await this.cache.delByPrefix(`dashboard:alerts:${organizationId}`);
  }

  async invalidatePortalSummary(organizationId: string, vehicleId?: string) {
    if (vehicleId) {
      await this.cache.del(this.cache.cacheKey('portal:summary', organizationId, vehicleId));
      return;
    }
    await this.cache.delByPrefix(`portal:summary:${organizationId}`);
  }

  async invalidateFinancial(organizationId: string) {
    await this.invalidateOperational(organizationId);
    await this.cache.delByPrefix(`financial:summary:${organizationId}`);
  }

  async invalidateBranding(organizationId: string) {
    await this.cache.del(this.cache.cacheKey('branding', organizationId));
  }

  async invalidateSettings(organizationId: string) {
    await this.cache.del(this.cache.cacheKey('settings', organizationId));
    await this.invalidateBranding(organizationId);
  }

  async invalidateInventory(organizationId: string) {
    await this.cache.delByPrefix(`inventory:${organizationId}`);
    await this.invalidateOperational(organizationId);
  }
}
