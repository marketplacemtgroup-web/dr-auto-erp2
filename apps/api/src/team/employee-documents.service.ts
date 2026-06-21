import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

const DOCS_BUCKET = 'documents';

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async list(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    organizationId: string,
    employeeId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    docType: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const safeName = file.originalname.replace(/[^\w.\-() ]+/g, '_').slice(0, 120);
    const storagePath = `employees/${organizationId}/${employeeId}/${Date.now()}_${safeName}`;

    await this.storage.upload(
      DOCS_BUCKET,
      storagePath,
      file.buffer,
      file.mimetype || 'application/octet-stream',
    );

    return this.prisma.employeeDocument.create({
      data: {
        employeeId,
        docType: docType || 'outro',
        fileName: safeName,
        fileUrl: storagePath,
      },
    });
  }

  async remove(organizationId: string, employeeId: string, docId: string) {
    const doc = await this.prisma.employeeDocument.findFirst({
      where: { id: docId, employeeId },
      include: { employee: true },
    });
    if (!doc || doc.employee.organizationId !== organizationId) {
      throw new NotFoundException('Documento não encontrado');
    }

    try {
      await this.storage.remove(DOCS_BUCKET, doc.fileUrl);
    } catch {
      /* ignore */
    }

    await this.prisma.employeeDocument.delete({ where: { id: docId } });
    return { ok: true };
  }

  async signedUrl(fileUrl: string): Promise<string> {
    if (fileUrl.startsWith('http')) return fileUrl;
    return this.storage.createSignedUrl(DOCS_BUCKET, fileUrl);
  }
}
