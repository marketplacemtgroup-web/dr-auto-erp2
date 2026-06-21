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
    const images = (os.attachments ?? []).filter((a) => a.mimeType.startsWith('image/'));
    const extraTerms = org.termsServiceOrder?.trim();
    const contactLine = [branding.phone, branding.email].filter(Boolean).join(' · ');
    const openedAt = os.enteredAt ?? os.createdAt;

    const itemsRows =
      os.items.length === 0
        ? `<tr><td colspan="4" class="muted text-center" style="padding:12px 8px;">Nenhum item lancado.</td></tr>`
        : os.items
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
          <p class="doc-type">Ordem de servico</p>
          <p class="doc-number">#${os.number}</p>
          <p class="doc-meta">${escapeHtml(osStatusLabel(os.status))}</p>
          <p class="doc-meta">Abertura: ${escapeHtml(formatDateTime(openedAt?.toISOString()))}</p>
        </div>
      </header>

      <section class="cards">
        <div class="card">
          <p class="card-title">Cliente</p>
          ${printField('Nome', customer.name)}
          ${printField('Endereco', formatCustomerAddress(customer))}
          ${printField('Telefone', customer.phone ?? '')}
          ${printField('WhatsApp', customer.whatsapp ?? '')}
          ${printField('E-mail', customer.email ?? '')}
        </div>
        <div class="card">
          <p class="card-title">Veiculo</p>
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
                  ? `<div style="margin-bottom:8px;"><p class="section-title">Reclamacao</p><p class="whitespace-pre">${escapeHtml(os.complaint)}</p></div>`
                  : ''
              }
              ${
                os.diagnosis
                  ? `<div><p class="section-title">Diagnostico</p><p class="whitespace-pre">${escapeHtml(os.diagnosis)}</p></div>`
                  : ''
              }
            </section>`
          : ''
      }

      <section>
        <p class="section-title">Servicos e pecas</p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Descricao</th>
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
              <p class="section-title">Pagamento combinado</p>
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
          <div><div class="signature-line">Responsavel da oficina</div></div>
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
    const customer = os.vehicle.customer;
    const vehicle = os.vehicle;
    const extraTerms = (quote.terms?.trim() || org.termsQuote?.trim()) ?? '';
    const contactLine = [branding.phone, branding.email].filter(Boolean).join(' · ');
    const validUntil = quote.validUntil
      ? quote.validUntil.toISOString().slice(0, 10)
      : quote.createdAt
        ? new Date(new Date(quote.createdAt).getTime() + 15 * 86400000).toISOString().slice(0, 10)
        : null;

    const lines =
      quote.lines.length > 0
        ? quote.lines.map((line) => ({
            description: line.description,
            tipo: lineTypeLabel(line.lineType),
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
            total: Number(line.unitPrice) * line.quantity - Number(line.discount ?? 0),
          }))
        : os.items.map((item) => ({
            description: item.description,
            tipo: itemTypeLabel(item.itemType),
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            total: Number(item.unitPrice) * item.quantity,
          }));

    const linesRows =
      lines.length === 0
        ? `<tr><td colspan="5" class="muted text-center" style="padding:12px 8px;">Nenhum item no orcamento.</td></tr>`
        : lines
            .map(
              (line) => `<tr>
                <td>${escapeHtml(line.description)}</td>
                <td class="muted">${escapeHtml(line.tipo)}</td>
                <td class="text-center">${line.quantity}</td>
                <td class="text-right">${formatMoney(line.unitPrice)}</td>
                <td class="text-right total-value">${formatMoney(line.total)}</td>
              </tr>`,
            )
            .join('');

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
          <p class="doc-type">Orcamento</p>
          <p class="doc-number">#${quote.number ?? '—'}</p>
          <p class="doc-meta">${escapeHtml(quoteStatusLabel(quote.status))}</p>
          ${
            quote.createdAt
              ? `<p class="doc-meta">Emissao: ${escapeHtml(formatDateTime(quote.createdAt.toISOString()))}</p>`
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
          ${printField('Endereco', formatCustomerAddress(customer))}
          ${printField('Telefone', customer.phone ?? '')}
          ${printField('WhatsApp', customer.whatsapp ?? '')}
          ${printField('E-mail', customer.email ?? '')}
        </div>
        <div class="card">
          <p class="card-title">Veiculo</p>
          ${printField('Placa', vehicle.plate)}
          ${printField('Modelo', [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '))}
          ${vehicle.color ? printField('Cor', vehicle.color) : ''}
          ${printField('OS relacionada', `#${os.number}`)}
        </div>
      </section>

      ${
        os.complaint
          ? `<section style="margin-bottom:16px;">
              <p class="section-title">Solicitacao / reclamacao</p>
              <p class="whitespace-pre">${escapeHtml(os.complaint)}</p>
            </section>`
          : ''
      }

      <section>
        <p class="section-title">Servicos e pecas</p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Descricao</th>
              <th class="text-left" style="width:64px;">Tipo</th>
              <th class="text-center" style="width:48px;">Qtd</th>
              <th class="text-right" style="width:80px;">Unit.</th>
              <th class="text-right" style="width:96px;">Total</th>
            </tr>
          </thead>
          <tbody>${linesRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right">Total do orcamento</td>
              <td class="text-right total-value">${formatMoney(quote.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      ${
        quote.paymentAgreement?.trim()
          ? `<section style="margin-bottom:16px;">
              <p class="section-title">Pagamento combinado</p>
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
          <div><div class="signature-line">Responsavel da oficina</div></div>
        </div>
      </footer>
    `;

    return wrapPrintDocument(`Orcamento #${quote.number ?? id}`, body);
  }
}
