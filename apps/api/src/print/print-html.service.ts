import { Injectable, NotFoundException } from '@nestjs/common';
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
  itemTypeLabel,
  lineTypeLabel,
  osStatusLabel,
  printField,
  printLegalTermsHtml,
  quoteStatusLabel,
  resolvePrintBranding,
  wrapPrintDocument,
} from './print-html.utils';

@Injectable()
export class PrintHtmlService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly serviceOrders: ServiceOrdersService,
    private readonly quotes: QuotesService,
  ) {}

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

    const itemsRows =
      (os.items ?? []).length === 0
        ? `<tr><td colspan="4" class="muted text-center" style="padding:12px 8px;">Nenhum item lancado.</td></tr>`
        : (os.items ?? [])
            .map((item) => {
              const total = Number(item.unitPrice) * item.quantity;
              return `<tr>
                <td>${escapeHtml(item.description)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatMoney(item.unitPrice)}</td>
                <td class="text-right total-value">${formatMoney(total)}</td>
              </tr>`;
            })
            .join('');

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

    const checklistPhotoCards = (os.checklistItems ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((item) => {
        const slug = checklistCategorySlug(item.label);
        const photo = photoByCategory.get(slug);
        if (!photo) return [];
        usedAttachmentIds.add(photo.id);
        const resultLabel = checklistResultLabel(item.result);
        const notes = item.notes?.trim();
        return [
          `<div class="photo-card">
            <p class="photo-label">${escapeHtml(item.label)}${resultLabel ? ` — <span class="photo-result">${escapeHtml(resultLabel)}</span>` : ''}</p>
            <img src="/api/attachments/${escapeHtml(photo.id)}/file" alt="${escapeHtml(item.label)}" />
            ${notes ? `<p class="photo-notes">${escapeHtml(notes)}</p>` : ''}
          </div>`,
        ];
      })
      .join('');

    const mediaPhotoCards = images
      .filter(
        (attachment) =>
          !attachment.category?.startsWith('checklist-') &&
          !usedAttachmentIds.has(attachment.id),
      )
      .map(
        (attachment) =>
          `<div class="photo-card">
            <p class="photo-label">${escapeHtml(attachment.fileName)}</p>
            <img src="/api/attachments/${escapeHtml(attachment.id)}/file" alt="${escapeHtml(attachment.fileName)}" />
          </div>`,
      )
      .join('');

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

      <section>
        <p class="section-title">Serviços e Peças</p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Descrição</th>
              <th class="text-center" style="width:48px;">Qtd</th>
              <th class="text-right" style="width:80px;">Unit.</th>
              <th class="text-right" style="width:96px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right">Total</td>
              <td class="text-right total-value">${formatMoney(os.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

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

    const freeTextEnabled = quote.freeTextEnabled && quote.freeTextContent?.trim();
    const displayAmount = freeTextEnabled && quote.freeTextAmount != null
      ? Number(quote.freeTextAmount)
      : Number(quote.amount);

    const lines =
      freeTextEnabled
        ? []
        : (quote.lines ?? []).length > 0
          ? (quote.lines ?? []).map((line) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: Number(line.unitPrice),
              total: Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0),
            }))
          : (os.items ?? []).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              total: Number(item.unitPrice) * item.quantity,
            }));

    const linesRows =
      freeTextEnabled
        ? `<tr>
            <td class="whitespace-pre">${escapeHtml(quote.freeTextContent!.trim())}</td>
            <td class="text-center">1</td>
            <td class="text-right">${formatMoney(displayAmount)}</td>
            <td class="text-right total-value">${formatMoney(displayAmount)}</td>
          </tr>`
        : lines.length === 0
          ? `<tr><td colspan="4" class="muted text-center" style="padding:12px 8px;">Nenhum item no orçamento.</td></tr>`
          : lines
              .map(
                (line) => `<tr>
                <td>${escapeHtml(line.description)}</td>
                <td class="text-center">${line.quantity}</td>
                <td class="text-right">${formatMoney(line.unitPrice)}</td>
                <td class="text-right total-value">${formatMoney(line.total)}</td>
              </tr>`,
              )
              .join('');

    const photosHtml =
      images.length > 0
        ? `<section style="margin-bottom:16px;">
            <p class="section-title">Registro fotografico</p>
            <div class="photos">
              ${images
                .map(
                  (a) =>
                    `<div><img src="/api/attachments/${escapeHtml(a.id)}/file" alt="${escapeHtml(a.fileName)}" /></div>`,
                )
                .join('')}
            </div>
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

      <section>
        <p class="section-title">Serviços e Peças</p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Descrição</th>
              <th class="text-center" style="width:48px;">Qtd</th>
              <th class="text-right" style="width:80px;">Unit.</th>
              <th class="text-right" style="width:96px;">Total</th>
            </tr>
          </thead>
          <tbody>${linesRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right">Total</td>
              <td class="text-right total-value">${formatMoney(displayAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

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
