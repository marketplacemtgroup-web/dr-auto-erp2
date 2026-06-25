import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentEntityType } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, posix } from 'path';

const LOCAL_UPLOAD_ROOT = join(process.cwd(), 'uploads');
const SIGNED_URL_TTL_SEC = 86400;
const SIGNED_URL_CACHE_TTL_MS = 23 * 60 * 60 * 1000;

type CachedSignedUrl = { url: string; expiresAt: number };

export const BRANDING_BUCKET = 'branding';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;
  private readonly signedUrlCache = new Map<string, CachedSignedUrl>();

  constructor(private readonly config: ConfigService) {}

  isCloudStorage(): boolean {
    return !!(this.config.get<string>('SUPABASE_URL') && this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'));
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para Storage na nuvem');
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    return this.client;
  }

  bucketForEntity(entityType: AttachmentEntityType): string {
    switch (entityType) {
      case AttachmentEntityType.SERVICE_ORDER:
        return 'os-media';
      case AttachmentEntityType.VEHICLE:
        return 'vehicle-photos';
      default:
        return 'documents';
    }
  }

  /** Path relativo POSIX gravado no banco (sem bucket). */
  normalizeStoragePath(...parts: string[]): string {
    return parts.map((p) => p.replace(/\\/g, '/')).join('/').replace(/^\/+/, '');
  }

  private signedUrlCacheKey(bucket: string, storagePath: string): string {
    return `${bucket}:${this.normalizeStoragePath(storagePath)}`;
  }

  private invalidateSignedUrlCache(bucket: string, storagePath: string): void {
    this.signedUrlCache.delete(this.signedUrlCacheKey(bucket, storagePath));
  }

  async upload(
    bucket: string,
    storagePath: string,
    buffer: Buffer,
    contentType: string,
    upsert = false,
  ): Promise<void> {
    const path = this.normalizeStoragePath(storagePath);
    if (this.isCloudStorage()) {
      const { error } = await this.getClient()
        .storage.from(bucket)
        .upload(path, buffer, { contentType, upsert });
      if (error) {
        this.logger.error(`Upload falhou: ${error.message}`);
        if (error.message?.includes('does not exist') || (error as { statusCode?: string }).statusCode === '404') {
          throw new Error(
            `Bucket "${bucket}" não existe no Supabase Storage. Rode: node scripts/ensure-supabase-buckets.mjs`,
          );
        }
        throw new Error('Falha ao enviar arquivo para o storage');
      }
      this.invalidateSignedUrlCache(bucket, path);
      return;
    }
    const full = join(LOCAL_UPLOAD_ROOT, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, buffer);
  }

  async remove(bucket: string, storagePath: string): Promise<void> {
    const path = this.normalizeStoragePath(storagePath);
    this.invalidateSignedUrlCache(bucket, path);
    if (this.isCloudStorage()) {
      await this.getClient().storage.from(bucket).remove([path]);
      return;
    }
    try {
      await unlink(join(LOCAL_UPLOAD_ROOT, path));
    } catch {
      /* arquivo local já removido */
    }
  }

  async createSignedUploadUrl(
    bucket: string,
    storagePath: string,
  ): Promise<{ signedUrl: string; path: string; token: string }> {
    const path = this.normalizeStoragePath(storagePath);
    if (!this.isCloudStorage()) {
      throw new Error('Upload direto só está disponível com Supabase Storage configurado');
    }
    const { data, error } = await this.getClient().storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      this.logger.error(`Signed upload URL falhou: ${error?.message}`);
      if (error?.message?.includes('does not exist') || error?.statusCode === '404') {
        throw new Error(
          `Bucket "${bucket}" não existe no Supabase Storage. Rode: node scripts/ensure-supabase-buckets.mjs`,
        );
      }
      throw new Error('Não foi possível preparar upload no storage');
    }
    return { signedUrl: data.signedUrl, path: data.path, token: data.token };
  }

  async createSignedUrl(bucket: string, storagePath: string, expiresIn = SIGNED_URL_TTL_SEC): Promise<string> {
    const path = this.normalizeStoragePath(storagePath);
    if (!this.isCloudStorage()) {
      return `/api/uploads/${path}`;
    }
    const cacheKey = this.signedUrlCacheKey(bucket, path);
    const cached = this.signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }
    const { data, error } = await this.getClient()
      .storage.from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      this.logger.error(`Signed URL falhou: ${error?.message}`);
      throw new Error('Não foi possível gerar URL do arquivo');
    }
    this.signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS,
    });
    return data.signedUrl;
  }

  /** URL pública para buckets públicos (ex.: branding) ou proxy local em dev. */
  publicObjectUrl(bucket: string, storagePath: string): string {
    const path = this.normalizeStoragePath(storagePath);
    if (this.isCloudStorage()) {
      const base = this.config.get<string>('SUPABASE_URL')!.replace(/\/$/, '');
      return `${base}/storage/v1/object/public/${bucket}/${path}`;
    }
    return `/api/uploads/${path}`;
  }

  async readLocalOrThrow(storagePath: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    const path = this.normalizeStoragePath(storagePath);
    const buffer = await readFile(join(LOCAL_UPLOAD_ROOT, path));
    return { buffer };
  }
}
