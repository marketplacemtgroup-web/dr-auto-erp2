import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from '../attachments/attachments.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { QuotesService } from '../quotes/quotes.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import {
  escapeHtml,
  formatCustomerAddress,
  formatDate,
  formatDateTime,
  formatMoney,
  checklistCategorySlug,
  checklistResultLabel,
  osStatusLabel,
  printField,
  printLegalTermsHtml,
  quoteStatusLabel,
  resolvePrintBranding,
  wrapPrintDocument,
} from './print-html.utils';

type PrintLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemType?: string;
};

@Injectable()
export class PrintHtmlService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly serviceOrders: ServiceOrdersService,
    private readonly quotes: QuotesService,
    private readonly attachments: AttachmentsService,
  ) {}

  private async resolveImageSrc(organizationId: string, attachmentId: string): Promise<string> {
    try {
      const { url } = await this.attachments.getSignedUrlForClient(organizationId, attachmentId);
      if (url?.trim()) return url.trim();
    } catch {
      /* fallback abaixo */
    }
    return `/api/attachments/${attachmentId}/file`;
  }

  private partitionLines(lines: PrintLine[]) {
    const services: PrintLine[] = [];
    const parts: PrintLine[] = [];
    for (const line of lines) {
      if (line.itemType === 'PART') parts.push(line);
      else services.push(line);
    }
    return { services, parts };
  }

  private renderItemsSections(lines: PrintLine[], grandTotal: number | string): string {
    if (lines.length === 0) {
      return `<section>
        <p class="section-title">Serviços e Peças</p>
        <table>
          <tbody><tr><td colspan="4" class="muted text-center" style="padding:12px 8px;">Nenhum item lancado.</td></tr></tbody>
        </table>
      </section>`;
    }

    const { services, parts } = this.partitionLines(lines);
    const renderTable = (title: string, rows: PrintLine[]) => {
      if (rows.length === 0) return '';
      const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
      const body = rows
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.description)}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatMoney(item.unitPrice)}</td>
            <td class="text-right total-value">${formatMoney(item.total)}</td>
          </tr>`,
        )
        .join('');
      return `<section>
        <p class="section-title">${escapeHtml(title)}</p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Descrição</th>
              <th class="text-center" style="width:48px;">Qtd</th>
              <th class="text-right" style="width:80px;">Unit.</th>
              <th class="text-right" style="width:96px;">Total</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right muted">Subtotal ${escapeHtml(title.toLowerCase())}</td>
              <td class="text-right">${formatMoney(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`;
    };

    return `${renderTable('Serviços', services)}
      ${renderTable('Peças', parts)}
      <section>
        <table>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right">Total geral</td>
              <td class="text-right total-value">${formatMoney(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`;
  }

  async renderServiceOrder(organizationId: string, id: string): Promise<string> {
    const [org, os] = await Promise.all([
      this.organizations.getOrganization(organizationId),
      this.serviceOrders.findOne(organizationId, id),
    ]);

    if (!os) throw new NotFoundException('Ordem de servico nao encontrada');

    const branding = resolvePrintBranding(org);
    const customer = os.vehicle.customer;
    const vehicle = os.vehicle;
    const extraTerms = org.termsServiceOrder?.trim();
    const contactLine = [branding.phone, branding.email].filter(Boolean).join(' · ');
    const openedAt = os.enteredAt ?? os.createdAt;

    const printLines: PrintLine[] = (os.items ?? []).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.unitPrice) * item.quantity,
      itemType: item.itemType,
    }));

    const images = (os.attachments ?? []).filter((a) =>
      (a.mimeType ?? '').startsWith('image/'),
    );
    const photoByCategory = new Map<string, (typeof images)[number]>();
    for (const attachment of images) {
      if (attachment.category?.startsWith('checklist-')) {
        photoByCategory.set(attachment.category, attachment);
      }
    }
    const usedAttachmentIds = new Set<string>();

    const checklistPhotoCards = (
      await Promise.all(
        (os.checklistItems ?? [])
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (item) => {
            const slug = checklistCategorySlug(item.label);
            const photo = photoByCategory.get(slug);
            if (!photo) return '';
            usedAttachmentIds.add(photo.id);
            const resultLabel = checklistResultLabel(item.result);
            const notes = item.notes?.trim();
            const src = await this.resolveImageSrc(organizationId, photo.id);
            return `<div class="photo-card">
            <p class="photo-label">${escapeHtml(item.label)}${resultLabel ? ` — <span class="photo-result">${escapeHtml(resultLabel)}</span>` : ''}</p>
            <img src="${escapeHtml(src)}" alt="${escapeHtml(item.label)}" />
            ${notes ? `<p class="photo-notes">${escapeHtml(notes)}</p>` : ''}
          </div>`;
          }),
      )
    ).join('');

    const mediaPhotoCards = (
      await Promise.all(
        images
          .filter(
            (attachment) =>
              !attachment.category?.startsWith('checklist-') &&
              !usedAttachmentIds.has(attachment.id),
          )
          .map(async (attachment) => {
            const src = await this.resolveImageSrc(organizationId, attachment.id);
            return `<div class="photo-card">
            <p class="photo-label">${escapeHtml(attachment.fileName)}</p>
            <img src="${escapeHtml(src)}" alt="${escapeHtml(attachment.fileName)}" />
          </div>`;
          }),
      )
    ).join('');

    const photosHtml =
      checklistPhotoCards || mediaPhotoCards
        ? `<section style="margin-bottom:16px;">
            <p class="section-title">Registro fotografico</p>
            <div class="photos">${checklistPhotoCards}${mediaPhotoCards}</div>
          </section>`
        : '';

    const body = `
      <header class="header">
        <div class="header-left">
          ${
            branding.logoUrl
              ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.name)}" />`
              : ''
          }
          <div>
            <h1>${escapeHtml(branding.name)}</h1>
            ${branding.document ? `<p>CNPJ: ${escapeHtml(branding.document)}</p>` : ''}
            <p>${escapeHtml(branding.address)}</p>
            ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ''}
          </div>
        </div>
        <div class="header-right">
          <p class="doc-type">Ordem de Serviço</p>
          <p class="doc-number">#${os.number}</p>
          <p class="doc-meta">${escapeHtml(osStatusLabel(os.status))}</p>
          <p class="doc-meta">Abertura: ${escapeHtml(formatDateTime(openedAt?.toISOString()))}</p>
        </div>
      </header>

      <section class="cards">
        <div class="card">
          <p class="card-title">Cliente</p>
          ${printField('Nome', customer.name)}
          ${printField('Endereço', formatCustomerAddress(customer))}
          ${printField('Telefone', customer.phone ?? '')}
          ${printField('WhatsApp', customer.whatsapp ?? '')}
          ${printField('E-mail', customer.email ?? '')}
        </div>
        <div class="card">
          <p class="card-title">Veículo</p>
          ${printField('Placa', vehicle.plate)}
          ${printField('Modelo', [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '))}
          ${vehicle.color ? printField('Cor', vehicle.color) : ''}
          ${os.entryKm != null ? printField('KM entrada', String(os.entryKm)) : ''}
          ${os.bay ? printField('Box', os.bay) : ''}
        </div>
      </section>

      ${
        os.complaint || os.diagnosis
          ? `<section style="margin-bottom:16px;">
              ${
                os.complaint
                  ? `<div style="margin-bottom:8px;"><p class="section-title">Reclamação</p><p class="whitespace-pre">${escapeHtml(os.complaint)}</p></div>`
                  : ''
              }
              ${
                os.diagnosis
                  ? `<div><p class="section-title">Diagnóstico</p><p class="whitespace-pre">${escapeHtml(os.diagnosis)}</p></div>`
                  : ''
              }
            </section>`
          : ''
      }

      ${this.renderItemsSections(printLines, Number(os.totalAmount))}

      ${photosHtml}

      ${
        os.paymentAgreement?.trim()
          ? `<section style="margin-bottom:16px;">
              <p class="section-title">Forma de Pagamento</p>
              <p class="whitespace-pre">${escapeHtml(os.paymentAgreement.trim())}</p>
            </section>`
          : ''
      }

      <footer>
        ${printLegalTermsHtml()}
        ${
          extraTerms
            ? `<div style="margin:8px 0;">
                <p style="font-size:12px;font-weight:700;color:#111;margin:0 0 4px;">Termos complementares</p>
                <p class="whitespace-pre" style="font-size:11px;color:#444;text-align:justify;">${escapeHtml(extraTerms)}</p>
              </div>`
            : ''
        }
        ${
          branding.footerText
            ? `<p style="font-size:11px;color:#555;margin-bottom:12px;">${escapeHtml(branding.footerText)}</p>`
            : ''
        }
        <div class="signatures">
          <div><div class="signature-line">Assinatura do cliente</div></div>
          <div><div class="signature-line">Responsável da oficina</div></div>
        </div>
      </footer>
    `;

    return wrapPrintDocument(`OS #${os.number}`, body);
  }

  async renderQuote(organizationId: string, id: string): Promise<string> {
    const [org, quote] = await Promise.all([
      this.organizations.getOrganization(organizationId),
      this.quotes.findOne(organizationId, id),
    ]);

    if (!quote) throw new NotFoundException('Orcamento nao encontrado');

    const branding = resolvePrintBranding(org);
    const os = quote.serviceOrder;
    if (!os) throw new NotFoundException('Ordem de servico do orcamento nao encontrada');
    const fullOs = await this.serviceOrders.findOne(organizationId, os.id);
    const images = (fullOs?.attachments ?? []).filter(
      (a) =>
        (a.mimeType ?? '').startsWith('image/') &&
        (a.showOnQuote || (a.category ?? '').startsWith('checklist-')),
    );
    const customer = os.vehicle.customer;
    const vehicle = os.vehicle;
    const extraTerms = (quote.terms?.trim() || org.termsQuote?.trim()) ?? '';
    const contactLine = [branding.phone, branding.email].filter(Boolean).join(' · ');
    const validUntil = quote.validUntil
      ? quote.validUntil.toISOString().slice(0, 10)
      : quote.createdAt
        ? new Date(new Date(quote.createdAt).getTime() + 15 * 86400000).toISOString().slice(0, 10)
        : null;

    const freeTextEnabled = Boolean(quote.freeTextEnabled && quote.freeTextContent?.trim());
    const displayAmount =
      freeTextEnabled && quote.freeTextAmount != null
        ? Number(quote.freeTextAmount)
        : Number(quote.amount);

    const lines: PrintLine[] = freeTextEnabled
      ? []
      : (quote.lines ?? []).length > 0
        ? (quote.lines ?? []).map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            total: Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0),
            itemType: line.lineType ?? 'SERVICE',
          }))
        : (os.items ?? []).map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            total: Number(item.unitPrice) * item.quantity,
            itemType: item.itemType,
          }));

    const photosHtml =
      images.length > 0
        ? `<section style="margin-bottom:16px;">
            <p class="section-title">Registro fotografico</p>
            <div class="photos">
              ${(
                await Promise.all(
                  images.map(async (a) => {
                    const src = await this.resolveImageSrc(organizationId, a.id);
                    return `<div class="photo-card"><img src="${escapeHtml(src)}" alt="${escapeHtml(a.fileName)}" /></div>`;
                  }),
                )
              ).join('')}
            </div>
          </section>`
        : '';

    const freeTextSection = freeTextEnabled
      ? `<section>
          <p class="section-title">Descrição</p>
          <table>
            <tbody>
              <tr>
                <td class="whitespace-pre">${escapeHtml(quote.freeTextContent!.trim())}</td>
                <td class="text-center">1</td>
                <td class="text-right">${formatMoney(displayAmount)}</td>
                <td class="text-right total-value">${formatMoney(displayAmount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right">Total geral</td>
                <td class="text-right total-value">${formatMoney(displayAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`
      : this.renderItemsSections(lines, displayAmount);

    const body = `
      <header class="header">
        <div class="header-left">
          ${
            branding.logoUrl
              ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.name)}" />`
              : ''
          }
          <div>
            <h1>${escapeHtml(branding.name)}</h1>
            ${branding.document ? `<p>CNPJ: ${escapeHtml(branding.document)}</p>` : ''}
            <p>${escapeHtml(branding.address)}</p>
            ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ''}
          </div>
        </div>
        <div class="header-right">
          <p class="doc-type">Orçamento</p>
          <p class="doc-number">#${quote.number ?? '—'}</p>
          <p class="doc-meta">${escapeHtml(quoteStatusLabel(quote.status))}</p>
          ${
            quote.createdAt
              ? `<p class="doc-meta">Emissão: ${escapeHtml(formatDateTime(quote.createdAt.toISOString()))}</p>`
              : ''
          }
          ${
            validUntil
              ? `<p class="doc-meta">Validade: ${escapeHtml(formatDate(validUntil))}</p>`
              : ''
          }
        </div>
      </header>

      <section class="cards">
        <div class="card">
          <p class="card-title">Cliente</p>
          ${printField('Nome', customer.name)}
          ${printField('Endereço', formatCustomerAddress(customer))}
          ${printField('Telefone', customer.phone ?? '')}
          ${printField('WhatsApp', customer.whatsapp ?? '')}
          ${printField('E-mail', customer.email ?? '')}
        </div>
        <div class="card">
          <p class="card-title">Veículo</p>
          ${printField('Placa', vehicle.plate)}
          ${printField('Modelo', [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '))}
          ${vehicle.color ? printField('Cor', vehicle.color) : ''}
          ${printField('OS relacionada', `#${os.number}`)}
        </div>
      </section>

      ${
        os.complaint
          ? `<section style="margin-bottom:16px;">
              <p class="section-title">Solicitação / reclamação</p>
              <p class="whitespace-pre">${escapeHtml(os.complaint)}</p>
            </section>`
          : ''
      }

      ${freeTextSection}

      ${photosHtml}

      ${
        quote.paymentAgreement?.trim()
          ? `<section style="margin-bottom:16px;">
              <p class="section-title">Forma de Pagamento</p>
              <p class="whitespace-pre">${escapeHtml(quote.paymentAgreement.trim())}</p>
            </section>`
          : ''
      }

      <footer>
        ${printLegalTermsHtml()}
        ${
          extraTerms
            ? `<div style="margin:8px 0;">
                <p style="font-size:12px;font-weight:700;color:#111;margin:0 0 4px;">Termos complementares</p>
                <p class="whitespace-pre" style="font-size:11px;color:#444;text-align:justify;">${escapeHtml(extraTerms)}</p>
              </div>`
            : ''
        }
        ${
          branding.footerText
            ? `<p style="font-size:11px;color:#555;margin-bottom:12px;">${escapeHtml(branding.footerText)}</p>`
            : ''
        }
        <div class="signatures">
          <div><div class="signature-line">Assinatura do cliente</div></div>
          <div><div class="signature-line">Responsável da oficina</div></div>
        </div>
      </footer>
    `;

    return wrapPrintDocument(`Orcamento #${quote.number ?? id}`, body);
  }
}
