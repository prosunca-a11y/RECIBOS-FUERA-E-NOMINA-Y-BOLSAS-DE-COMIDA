import { jsPDF } from 'jspdf';
import { BenefitReceipt, CompanyConfig, Employee } from '../types';
import { formatBs, formatUSD } from './bcv';

/**
 * Generates clean standalone HTML for a Venezuelan non-salary benefit receipt.
 * Styled specifically for Letter size (215.9 x 279.4 mm), low toner consumption,
 * high legibility, proper legal clauses (LOTTT Art. 105, Sentencia 523 TSJ),
 * and boxes for physical wet thumbprint & signature.
 */
export function generateReceiptPrintHtml(receipt: BenefitReceipt, company: CompanyConfig): string {
  const isBolsa = receipt.category === 'bolsa_comida';
  const isMedical = receipt.category === 'gastos_medicos';

  const groceryRowsHtml =
    receipt.groceryItems && receipt.groceryItems.length > 0
      ? receipt.groceryItems
          .map(
            (item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 8.5pt;">[ &nbsp; ] ${item.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 8.5pt; text-align: center; font-weight: 600;">${item.quantity} ${item.unit}</td>
          </tr>`
          )
          .join('')
      : '';

  return `
    <div class="receipt-sheet" style="page-break-after: always; break-after: page; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px 28px; max-width: 800px; margin: 0 auto; box-sizing: border-box; font-size: 9pt; line-height: 1.35;">
      <!-- Header Banner -->
      <div style="border-bottom: 1px solid #94a3b8; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 11pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.2px;">${company.razonSocial}</div>
          <div style="font-size: 8.5pt; color: #334155; font-family: monospace;">RIF: ${company.rif}</div>
          <div style="font-size: 7.5pt; color: #64748b; max-width: 450px; margin-top: 2px;">${company.direccionFiscal}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #475569; text-transform: uppercase;">Comprobante de Beneficio</div>
          <div style="font-size: 11pt; font-weight: 800; font-family: monospace; color: #1e293b;">N° ${receipt.receiptNumber}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 1px;">Fecha: <strong>${receipt.issueDate}</strong></div>
        </div>
      </div>

      <!-- Title & Legal Header -->
      <div style="text-align: center; margin-bottom: 12px;">
        <h2 style="font-size: 10.5pt; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.2px;">
          ${isBolsa ? 'COMPROBANTE DE ENTREGA Y RECEPCIÓN DE BENEFICIO EN ESPECIE (VÍVERES)' : 'RECIBO DE BENEFICIO SOCIAL ASISTENCIAL NO REMUNERATIVO'}
        </h2>
        <div style="font-size: 7.5pt; color: #475569; margin-top: 2px; font-weight: 600;">
          Amparado taxativamente en el Artículo 105, Numeral 2 de la LOTTT • Art. 73 RLOT • Sentencia N° 523 TSJ (Caso INDULAC)
        </div>
      </div>

      <!-- 2-Column Worker & Entity Info -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 6px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th colspan="2" style="border-bottom: 1px solid #cbd5e1; padding: 4px 8px; font-size: 8pt; text-align: left; text-transform: uppercase; color: #334155; font-weight: 700;">
                    1. Datos del Patrono (Entidad de Trabajo)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;">Razón Social:</td>
                  <td style="padding: 3px 6px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${company.razonSocial}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b; border-bottom: 1px solid #f1f5f9;">R.I.F.:</td>
                  <td style="padding: 3px 6px; font-family: monospace; border-bottom: 1px solid #f1f5f9;">${company.rif}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b;">Representante:</td>
                  <td style="padding: 3px 6px; color: #0f172a;">${company.representanteLegal} (${company.cedulaRepresentante})</td>
                </tr>
              </tbody>
            </table>
          </td>

          <td style="width: 50%; vertical-align: top; padding-left: 6px;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th colspan="2" style="border-bottom: 1px solid #cbd5e1; padding: 4px 8px; font-size: 8pt; text-align: left; text-transform: uppercase; color: #334155; font-weight: 700;">
                    2. Datos del Trabajador Beneficiario
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b; width: 35%; border-bottom: 1px solid #f1f5f9;">Nombres / Apellidos:</td>
                  <td style="padding: 3px 6px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${receipt.employeeName}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Cédula Identidad:</td>
                  <td style="padding: 3px 6px; font-weight: 700; font-family: monospace; border-bottom: 1px solid #f1f5f9;">${receipt.employeeCedula}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; color: #64748b;">Cargo / Período:</td>
                  <td style="padding: 3px 6px; color: #0f172a;">${receipt.employeeCargo} • <strong>${receipt.coveragePeriod}</strong></td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </table>

      <!-- Benefit Specification -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 10px; font-size: 8.5pt;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th colspan="2" style="border-bottom: 1px solid #cbd5e1; padding: 4px 8px; font-size: 8pt; text-align: left; text-transform: uppercase; color: #334155; font-weight: 700;">
              3. Especificación del Beneficio y Soporte Asistencial
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 4px 8px; width: 28%; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Denominación:</td>
            <td style="padding: 4px 8px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${receipt.conceptTitle}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Naturaleza & Causa:</td>
            <td style="padding: 4px 8px; color: #334155; border-bottom: 1px solid #f1f5f9;">${receipt.conceptDescription}</td>
          </tr>
          ${
            receipt.paymentMethod === 'transferencia_independiente'
              ? `
          <tr>
            <td style="padding: 4px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Vía de Dispersión:</td>
            <td style="padding: 4px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Transferencia Bancaria Independiente de Nómina • ${receipt.bankName || 'Banco Comercial'} • Ref: <strong>${receipt.referenceNumber || 'Registrada en extracto'}</strong></td>
          </tr>
          `
              : ''
          }
          ${
            isMedical
              ? `
          <tr>
            <td style="padding: 4px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Soporte Médico / Factura:</td>
            <td style="padding: 4px 8px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Factura N° ${receipt.clinicalInvoiceNumber} (RIF: ${receipt.clinicalInvoiceRIF}) • Paciente: ${receipt.patientName} (${receipt.patientRelation})</td>
          </tr>
          `
              : ''
          }
        </tbody>
      </table>

      <!-- Grocery Table if applicable -->
      ${
        isBolsa && groceryRowsHtml
          ? `
      <div style="margin-bottom: 10px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 8pt;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border-bottom: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; text-transform: uppercase; color: #334155; font-weight: 700;">
                Relación de Víveres Entregados en Especie
              </th>
              <th style="border-bottom: 1px solid #cbd5e1; padding: 4px 8px; text-align: center; width: 25%; text-transform: uppercase; color: #334155; font-weight: 700;">
                Cantidad / Unidad
              </th>
            </tr>
          </thead>
          <tbody>
            ${groceryRowsHtml}
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      <!-- Financial & BCV Settlement Box (Clean Toner Saving) -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; margin-bottom: 10px; font-size: 8.5pt; background-color: #ffffff;">
        <tr>
          <td style="padding: 6px 12px; width: 33.3%; border-right: 1px solid #cbd5e1; text-align: center;">
            <div style="font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: 600;">Valor Referencial USD</div>
            <div style="font-size: 11.5pt; font-weight: 800; font-family: monospace; color: #0f172a;">${formatUSD(receipt.amountUSD)}</div>
          </td>
          <td style="padding: 6px 12px; width: 33.3%; border-right: 1px solid #cbd5e1; text-align: center;">
            <div style="font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: 600;">Tasa Oficial BCV</div>
            <div style="font-size: 11pt; font-weight: 700; font-family: monospace; color: #334155;">Bs. ${receipt.tasaBCV.toFixed(2)}</div>
          </td>
          <td style="padding: 6px 12px; width: 33.3%; text-align: center; background-color: #ffffff;">
            <div style="font-size: 7.5pt; color: #475569; text-transform: uppercase; font-weight: 700;">Monto Equivalente en Bolívares</div>
            <div style="font-size: 11.5pt; font-weight: 800; font-family: monospace; color: #15803d;">${formatBs(receipt.amountBs)}</div>
          </td>
        </tr>
      </table>

      <!-- Mandatory Exemption Clause -->
      <div style="border: 1px solid #e2e8f0; border-left: 2.5px solid #64748b; padding: 6px 8px; background-color: #fafafa; font-size: 7.2pt; color: #334155; text-align: justify; line-height: 1.35; margin-bottom: 14px;">
        <strong>CLÁUSULA DE EXCLUSIÓN SALARIAL (ART. 105 LOTTT - SENTENCIA N° 523 TSJ):</strong> El TRABAJADOR declara recibir a su entera conformidad el presente beneficio de carácter estrictamente social y no remunerativo, convenido como ayuda para su núcleo familiar. Se deja constancia expresa de que este beneficio NO TIENE CARÁCTER SALARIAL, NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL, y en ningún caso computará para la liquidación de Prestaciones Sociales, Vacaciones, Bono Vacacional, Utilidades ni indemnizaciones derivadas de la relación de trabajo.
      </div>

      <!-- Dual Signatures & Thumbprint Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <!-- Patrono Signature -->
          <td style="width: 38%; vertical-align: top; text-align: center; padding: 0 10px;">
            <div style="height: 44px; border-bottom: 1px solid #64748b; margin-bottom: 4px;"></div>
            <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">POR LA ENTIDAD DE TRABAJO</div>
            <div style="font-size: 7.5pt; color: #475569;">${company.representanteLegal}</div>
            <div style="font-size: 7pt; color: #64748b;">${company.cargoRepresentante} • C.I. ${company.cedulaRepresentante}</div>
          </td>

          <!-- Worker Signature -->
          <td style="width: 38%; vertical-align: top; text-align: center; padding: 0 10px;">
            <div style="height: 44px; border-bottom: 1px solid #64748b; margin-bottom: 4px;"></div>
            <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">EL TRABAJADOR (CONFORME)</div>
            <div style="font-size: 7.5pt; color: #475569;">${receipt.employeeName}</div>
            <div style="font-size: 7pt; color: #64748b;">C.I. ${receipt.employeeCedula}</div>
          </td>

          <!-- Wet Thumbprint Box (Strict SENIAT & Labor Mandate) -->
          <td style="width: 24%; vertical-align: top; text-align: center; padding: 0 6px;">
            <div style="width: 82px; height: 96px; border: 1px dashed #94a3b8; margin: 0 auto 3px auto; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #ffffff;">
              <span style="font-size: 6.5pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Huella Dactilar</span>
              <span style="font-size: 6pt; color: #94a3b8;">Pulgar Derecho</span>
              <span style="font-size: 5.5pt; color: #cbd5e1; margin-top: 4px;">(Tinta Húmeda)</span>
            </div>
            <div style="font-size: 6.5pt; font-weight: 600; color: #475569;">Soporte Probatorio TSJ</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Executes a clean print operation for one or multiple receipts.
 * Solves the issue where window.print() inside iframes fails or prints modal backgrounds.
 * Uses a dedicated hidden iframe populated only with the clean printable document.
 */
export function printReceiptsDirectly(
  receipts: BenefitReceipt[],
  company: CompanyConfig
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Remove any previously created print frame
      const existingFrame = document.getElementById('receipt-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      // Create a hidden print iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        // Fallback: trigger standard print
        window.print();
        resolve(true);
        return;
      }

      const allReceiptsHtml = receipts
        .map((r) => generateReceiptPrintHtml(r, company))
        .join('\n');

      const printHtmlDocument = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Impresión de Comprobantes - ${company.razonSocial}</title>
          <style>
            @page {
              size: letter portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            .receipt-sheet {
              page-break-after: always;
              break-after: page;
            }
            .receipt-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>
          ${allReceiptsHtml}
        </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(printHtmlDocument);
      frameDoc.close();

      // Allow DOM to settle before invoking print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print()', err);
          window.print();
          resolve(true);
        }
      }, 350);
    } catch (error) {
      console.error('Error during print execution:', error);
      try {
        window.print();
      } catch (e) {
        console.error('window.print also failed:', e);
      }
      resolve(false);
    }
  });
}

/**
 * Generates and downloads a high-fidelity vector PDF for a single receipt using jsPDF.
 * Guaranteeing that user gets an actual .pdf file on disk even if printer dialogs are blocked.
 */
export function downloadReceiptPDF(receipt: BenefitReceipt, company: CompanyConfig): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  renderReceiptToJsPdf(doc, receipt, company);

  const safeNumber = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = receipt.employeeCedula.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Comprobante_${safeNumber}_${safeName}.pdf`);
}

/**
 * Generates and downloads a multi-page PDF containing all specified receipts.
 * Perfect for batch printing/archiving across all company employees in 1 click!
 */
export function downloadBatchReceiptsPDF(
  receipts: BenefitReceipt[],
  company: CompanyConfig,
  batchTitle = 'Lote_Comprobantes'
): void {
  if (!receipts || receipts.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  receipts.forEach((receipt, index) => {
    if (index > 0) {
      doc.addPage();
    }
    renderReceiptToJsPdf(doc, receipt, company);
  });

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`${batchTitle}_${company.rif}_${timestamp}.pdf`);
}

/**
 * Internal helper to draw a crisp, legally compliant receipt onto a jsPDF page.
 */
function renderReceiptToJsPdf(
  doc: jsPDF,
  receipt: BenefitReceipt,
  company: CompanyConfig
) {
  const isBolsa = receipt.category === 'bolsa_comida';
  const marginX = 16;
  let currentY = 18;

  // Header: Company & Receipt Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(company.razonSocial.toUpperCase(), marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`RIF: ${company.rif}`, marginX, currentY + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const splitDir = doc.splitTextToSize(company.direccionFiscal, 110);
  doc.text(splitDir, marginX, currentY + 8.5);

  // Right receipt meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPROBANTE DE BENEFICIO', 198 - marginX, currentY, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° ${receipt.receiptNumber}`, 198 - marginX, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${receipt.issueDate}`, 198 - marginX, currentY + 9, { align: 'right' });

  // Divider Line
  currentY += 16;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.line(marginX, currentY, 215.9 - marginX, currentY);

  // Main Document Title
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const titleText = isBolsa
    ? 'COMPROBANTE DE ENTREGA Y RECEPCIÓN DE BENEFICIO EN ESPECIE (VÍVERES)'
    : 'RECIBO DE BENEFICIO SOCIAL ASISTENCIAL NO REMUNERATIVO';
  doc.text(titleText, 107.95, currentY, { align: 'center' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Amparado taxativamente en el Artículo 105, Numeral 2 de la LOTTT • Art. 73 RLOT • Sentencia N° 523 TSJ (Caso INDULAC)',
    107.95,
    currentY,
    { align: 'center' }
  );

  // Section: Two Column Table (Patrono & Trabajador)
  currentY += 6;
  const colWidth = 88;
  const colGap = 8;
  const col2X = marginX + colWidth + colGap;

  // Box 1: Patrono
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, colWidth, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('1. ENTIDAD DE TRABAJO (PATRONO)', marginX + 3, currentY + 4.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY + 6, marginX + colWidth, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Razón Social:', marginX + 3, currentY + 10);
  doc.setTextColor(15, 23, 42);
  doc.text(company.razonSocial.slice(0, 32), marginX + 24, currentY + 10);

  doc.setTextColor(100, 116, 139);
  doc.text('R.I.F.:', marginX + 3, currentY + 15);
  doc.setTextColor(15, 23, 42);
  doc.text(company.rif, marginX + 24, currentY + 15);

  doc.setTextColor(100, 116, 139);
  doc.text('Representante:', marginX + 3, currentY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`${company.representanteLegal.slice(0, 26)} (${company.cedulaRepresentante})`, marginX + 24, currentY + 20);

  // Box 2: Trabajador
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(col2X, currentY, colWidth, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('2. TRABAJADOR BENEFICIARIO', col2X + 3, currentY + 4.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(col2X, currentY + 6, col2X + colWidth, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Trabajador:', col2X + 3, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.employeeName.slice(0, 32), col2X + 24, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Cédula:', col2X + 3, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.employeeCedula, col2X + 24, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Cargo / Período:', col2X + 3, currentY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`${receipt.employeeCargo.slice(0, 18)} • ${receipt.coveragePeriod}`, col2X + 24, currentY + 20);

  // Box 3: Concept & Details
  currentY += 30;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, 215.9 - marginX * 2, 18, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('3. ESPECIFICACIÓN DEL BENEFICIO ASISTENCIAL', marginX + 3, currentY + 4.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY + 6, 215.9 - marginX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Concepto:', marginX + 3, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.conceptTitle.slice(0, 85), marginX + 22, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Descripción:', marginX + 3, currentY + 14.5);
  doc.setTextColor(51, 65, 85);
  doc.text(receipt.conceptDescription.slice(0, 100), marginX + 22, currentY + 14.5);

  currentY += 21;

  // If Food Basket: Grocery Items Table
  if (isBolsa && receipt.groceryItems && receipt.groceryItems.length > 0) {
    const tableWidth = 215.9 - marginX * 2;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, currentY, tableWidth, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text('RELACIÓN DETALLADA DE VÍVERES ENTREGADOS EN ESPECIE', marginX + 3, currentY + 3.5);
    doc.text('CANTIDAD', marginX + tableWidth - 25, currentY + 3.5);

    currentY += 5;
    const maxItemsToShow = Math.min(receipt.groceryItems.length, 8);
    for (let i = 0; i < maxItemsToShow; i++) {
      const item = receipt.groceryItems[i];
      const rowY = currentY + i * 4.8;
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.rect(marginX, rowY, tableWidth, 4.8, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(`[  ] ${item.name}`, marginX + 3, rowY + 3.3);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quantity} ${item.unit}`, marginX + tableWidth - 12, rowY + 3.3, { align: 'right' });
    }
    currentY += maxItemsToShow * 4.8 + 3;
  }

  // Box 4: Financial & BCV Settlement (Toner-saving layout)
  const boxWidth = 215.9 - marginX * 2;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, currentY, boxWidth, 16, 'FD');

  const third = boxWidth / 3;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginX + third, currentY, marginX + third, currentY + 16);
  doc.line(marginX + third * 2, currentY, marginX + third * 2, currentY + 16);

  // Column 1: USD
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR CONVENIDO USD', marginX + third / 2, currentY + 4.5, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formatUSD(receipt.amountUSD), marginX + third / 2, currentY + 12, { align: 'center' });

  // Column 2: Tasa BCV
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('TASA OFICIAL BCV', marginX + third * 1.5, currentY + 4.5, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Bs. ${receipt.tasaBCV.toFixed(2)}`, marginX + third * 1.5, currentY + 12, { align: 'center' });

  // Column 3: Total Bs
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EQUIVALENTE EN BS.', marginX + third * 2.5, currentY + 4.5, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text(formatBs(receipt.amountBs), marginX + third * 2.5, currentY + 12, { align: 'center' });

  currentY += 19;

  // Legal Exemption Box (LOTTT Art 105 & Sentencia 523)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(marginX, currentY, boxWidth, 14, 'FD');
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, marginX, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CLÁUSULA DE EXCLUSIÓN SALARIAL (ART. 105 LOTTT • SENTENCIA N° 523 TSJ):', marginX + 3, currentY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  const legalText =
    'El TRABAJADOR declara recibir a su entera conformidad el presente beneficio de carácter estrictamente social y no remunerativo, convenido como ayuda para su núcleo familiar. Se deja constancia expresa de que este beneficio NO TIENE CARÁCTER SALARIAL, NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL, y en ningún caso computará para la liquidación de Prestaciones Sociales, Vacaciones, Bono Vacacional, Utilidades ni indemnizaciones derivadas de la relación de trabajo.';
  const splitLegal = doc.splitTextToSize(legalText, boxWidth - 6);
  doc.text(splitLegal, marginX + 3, currentY + 6.8);

  currentY += 17;

  // Signatures & Wet Thumbprint
  const sigColWidth = 65;

  // Patrono signature
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.25);
  doc.line(marginX, currentY + 16, marginX + sigColWidth, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('POR LA ENTIDAD DE TRABAJO', marginX + sigColWidth / 2, currentY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(company.representanteLegal, marginX + sigColWidth / 2, currentY + 23.5, { align: 'center' });
  doc.text(`${company.cargoRepresentante} • C.I. ${company.cedulaRepresentante}`, marginX + sigColWidth / 2, currentY + 26.5, { align: 'center' });

  // Worker signature
  const workerX = marginX + sigColWidth + 6;
  doc.line(workerX, currentY + 16, workerX + sigColWidth, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('EL TRABAJADOR (CONFORME)', workerX + sigColWidth / 2, currentY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(receipt.employeeName, workerX + sigColWidth / 2, currentY + 23.5, { align: 'center' });
  doc.text(`C.I. ${receipt.employeeCedula}`, workerX + sigColWidth / 2, currentY + 26.5, { align: 'center' });

  // Wet Thumbprint Box (Strict physical proof)
  const thumbX = workerX + sigColWidth + 8;
  const thumbWidth = 34;
  const thumbHeight = 30;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(thumbX, currentY - 2, thumbWidth, thumbHeight, 'FD');
  doc.setLineDashPattern([], 0); // reset dash

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('HUELLA DACTILAR', thumbX + thumbWidth / 2, currentY + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Pulgar Derecho', thumbX + thumbWidth / 2, currentY + 13, { align: 'center' });
  doc.text('(Tinta Húmeda)', thumbX + thumbWidth / 2, currentY + 17, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Soporte Probatorio TSJ', thumbX + thumbWidth / 2, currentY + thumbHeight + 2, { align: 'center' });
}

export interface ContractPrintConfig {
  tipoBeneficio: 'bolsa_comida' | 'bono_transferencia' | string;
  periodicidad: string;
  diasEntrega: number;
  fechaDocumento?: string;
  montoUSD?: number;
}

export function formatContractSpanishDate(dateStr?: string, ciudad = 'Caracas'): string {
  if (!dateStr) {
    return `En <strong>${ciudad}</strong>, a los ______ días del mes de ____________________ del año 2026.`;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return `En <strong>${ciudad}</strong>, a los ______ días del mes de ____________________ del año 2026.`;
  }
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const monthName = months[monthNum - 1] || 'enero';
  return `En <strong>${ciudad}</strong>, a los ${day} días del mes de ${monthName} del año ${year}.`;
}

/**
 * Generates single-page printable HTML for an employment contract adenda.
 * Designed specifically for low toner consumption, standard Letter size,
 * legal compliance with LOTTT Art. 105 and TSJ Sentencia 523.
 */
export function generateContractPrintHtml(
  employee: Employee,
  company: CompanyConfig,
  config: ContractPrintConfig
): string {
  const isBolsa = config.tipoBeneficio === 'bolsa_comida';
  const fechaTexto = formatContractSpanishDate(config.fechaDocumento, company.ciudad);
  const montoTexto = config.montoUSD && config.montoUSD > 0
    ? ` (con una asignación o valor estimado de USD $${config.montoUSD.toFixed(2)} o su equivalente al cambio oficial BCV)`
    : '';

  return `
    <div class="contract-sheet" style="page-break-after: always; break-after: page; background: #ffffff; color: #000000; font-family: 'Times New Roman', Times, serif; padding: 18px 22px; max-width: 800px; margin: 0 auto; box-sizing: border-box; font-size: 9.5pt; line-height: 1.4; text-align: justify;">
      
      <!-- Heading -->
      <div style="text-align: center; border-bottom: 1.5px solid #000000; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="font-size: 8pt; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 700; color: #334155; text-transform: uppercase;">
          ${company.razonSocial} • RIF: ${company.rif}
        </div>
        <h1 style="font-size: 11pt; font-weight: 800; text-transform: uppercase; margin: 4px 0 2px 0; letter-spacing: 0.3px;">
          ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO
        </h1>
        <h2 style="font-size: 8.5pt; font-weight: 700; text-transform: uppercase; margin: 0; color: #1e293b;">
          OTORGAMIENTO DE BENEFICIO SOCIAL NO REMUNERATIVO ${isBolsa ? 'DE PROVISIÓN DE ALIMENTOS EN ESPECIE (BOLSAS DE COMIDA)' : 'DE ALIMENTACIÓN COMPLEMENTARIA'}
        </h2>
        <div style="font-size: 7.5pt; color: #475569; font-style: italic; margin-top: 2px;">
          Amparado taxativamente en el Artículo 105, Numeral 2 de la LOTTT • Art. 73 RLOT • Sentencia N° 523 TSJ (Caso INDULAC)
        </div>
      </div>

      <!-- Introduction -->
      <p style="text-indent: 1.8em; margin: 0 0 8px 0;">
        Entre la entidad de trabajo <strong>${company.razonSocial}</strong>, sociedad mercantil debidamente domiciliada en <strong>${company.ciudad}</strong>, inscrita por ante el <strong>${company.registroMercantil}</strong>, bajo el Registro de Información Fiscal (R.I.F.) N° <strong>${company.rif}</strong>, representada en este acto por el ciudadano <strong>${company.representanteLegal}</strong>, titular de la Cédula de Identidad N° <strong>${company.cedulaRepresentante}</strong>, en su carácter de <strong>${company.cargoRepresentante}</strong>, en lo sucesivo denominada <strong>"LA EMPRESA"</strong>, por una parte; y por la otra, el ciudadano(a) <strong>${employee.fullName}</strong>, titular de la Cédula de Identidad N° <strong>${employee.cedula}</strong>, de nacionalidad <strong>${employee.nacionalidad}</strong>, de estado civil <strong>${employee.estadoCivil}</strong>, domiciliado en <strong>${employee.direccion}</strong>, quien desempeña el cargo de <strong>${employee.cargo}</strong> adscrito al departamento de <strong>${employee.departamento}</strong>, en lo sucesivo denominado(a) <strong>"EL TRABAJADOR"</strong>, se ha convenido de mutuo acuerdo en suscribir la presente <strong>ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO</strong>, sujeta a las siguientes cláusulas:
      </p>

      <!-- Cláusula 1 -->
      <p style="text-indent: 1.8em; margin: 0 0 8px 0;">
        <strong><u>PRIMERA (OBJETO):</u></strong> En el marco de la protección integral a la familia y con el propósito de coadyuvar a la seguridad alimentaria y bienestar socioeconómico del TRABAJADOR y su núcleo familiar frente a las contingencias de la economía nacional, LA EMPRESA decide otorgar de manera directa y voluntaria un beneficio social no remunerativo ${
          isBolsa
            ? 'consistente en una (1) BOLSA / CESTA DE PRODUCTOS ALIMENTICIOS de primera necesidad e higiene básica'
            : 'consistente en una ayuda complementaria de alimentación mensual liquidada mediante dispersión bancaria independiente'
        }${montoTexto}.
      </p>

      <!-- Cláusula 2 -->
      <p style="text-indent: 1.8em; margin: 0 0 8px 0;">
        <strong><u>SEGUNDA (PERIODICIDAD Y MODALIDAD DE ENTREGA):</u></strong> ${
          isBolsa
            ? `La entrega de los productos alimenticios se efectuará con una periodicidad ${config.periodicidad}, dentro de los primeros ${config.diasEntrega} días de cada período, directamente en las instalaciones del centro de trabajo de LA EMPRESA. LA EMPRESA entregará junto con los víveres una relación descriptiva de los productos que integran la dotación para su correspondiente verificación y cotejo.`
            : `El pago complementario se efectuará con periodicidad ${config.periodicidad}, mediante transferencia bancaria efectuada desde cuentas bancarias independientes de la cuenta ordinaria de nómina.`
        }
      </p>

      <!-- Cláusula 3 - Blindaje Legal -->
      <div style="border: 1px solid #94a3b8; background-color: #f8fafc; padding: 6px 10px; margin: 8px 0; font-size: 8.5pt;">
        <strong><u>TERCERA (NATURALEZA JURÍDICA Y EXCLUSIÓN SALARIAL TAXATIVA):</u></strong> Ambas partes declaran, reconocen y aceptan de manera expresa, libre, consciente e irrevocable que el presente beneficio ${
          isBolsa ? 'en especie' : 'económico complementario'
        } constituye taxativamente un <strong>BENEFICIO SOCIAL DE CARÁCTER NO REMUNERATIVO</strong>, plenamente fundamentado en el <strong>Artículo 105, Numeral 2 de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT)</strong>, en concordancia con el <strong>Artículo 73 del Reglamento de la Ley Orgánica del Trabajo (RLOT)</strong> y la doctrina sentada en la <strong>Sentencia N° 523 de la Sala de Casación Social del Tribunal Supremo de Justicia (TSJ)</strong>. En consecuencia, las partes ratifican que:<br>
        a) <strong>NO TIENE CARÁCTER SALARIAL</strong> y no constituye contraprestación directa por el servicio prestado;<br>
        b) <strong>NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL</strong> del TRABAJADOR;<br>
        c) Queda <strong>ESTRICTAMENTE EXCLUIDO</strong> de la base de cálculo de las prestaciones sociales (garantía trimestral y cálculo retroactivo según Art. 142 LOTTT), utilidades de fin de año, bonificación vacacional, vacaciones anuales, horas extras, bono nocturno, recargos de feriados o descansos, e indemnizaciones por terminación de la relación de trabajo;<br>
        d) No integra la base de cálculo de las contribuciones parafiscales al Seguro Social Obligatorio (IVSS), Fondo de Ahorro Obligatorio para la Vivienda (FAOV) ni Instituto Nacional de Capacitación y Educación Socialista (INCES).
      </div>

      <!-- Cláusula 4 -->
      <p style="text-indent: 1.8em; margin: 0 0 7px 0;">
        <strong><u>CUARTA (CARÁCTER ASISTENCIAL Y ADECUACIONES):</u></strong> El presente beneficio reviste carácter estrictamente asistencial y de protección a la economía del hogar. ${
          isBolsa
            ? 'LA EMPRESA se reserva el derecho de adecuar la composición o sustituir marcas de los productos en función del mercado, garantizando la calidad nutricional de los víveres, sin que ello constituya desmejora laboral.'
            : 'LA EMPRESA evaluará la cuantía del aporte según la evolución de los índices de precios y la realidad socioeconómica.'
        }
      </p>

      <!-- Cláusula 5 -->
      <p style="text-indent: 1.8em; margin: 0 0 7px 0;">
        <strong><u>QUINTA (OBLIGACIÓN DE SUSCRIPCIÓN DE COMPROBANTE Y HUELLA):</u></strong> EL TRABAJADOR asume la obligación ineludible de suscribir el comprobante o recibo físico de recepción ${
          isBolsa ? 'al recibir cada dotación de alimentos' : 'al momento de liquidarse el beneficio'
        }, estampando su firma manuscrita y su huella dactilar húmeda (pulgar derecho), ratificando en cada oportunidad la recepción a satisfacción y la naturaleza no salarial del beneficio.
      </p>

      <!-- Cláusula 6 -->
      <p style="text-indent: 1.8em; margin: 0 0 7px 0;">
        <strong><u>SEXTA (VIGENCIA Y ADHESIÓN AL CONTRATO):</u></strong> La presente Adenda entra en vigencia a partir de su suscripción y se adhiere de forma permanente al Contrato Individual de Trabajo suscrito entre las partes, manteniendo sus demás cláusulas plenamente vigentes.
      </p>

      <p style="margin: 6px 0; font-size: 8.5pt;">
        Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, haciéndosele entrega al TRABAJADOR de un ejemplar original debidamente sellado y firmado, en cumplimiento de los Artículos 58 y 59 de la LOTTT.
      </p>

      <p style="margin: 8px 0; font-size: 9pt;">
        ${fechaTexto}
      </p>

      <!-- Dual Signatures & Thumbprint Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 14px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <tr>
          <!-- Patrono Signature -->
          <td style="width: 38%; vertical-align: top; text-align: center; padding: 0 8px;">
            <div style="height: 40px; border-bottom: 1.5px solid #000000; margin-bottom: 4px;"></div>
            <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a;">POR LA EMPRESA</div>
            <div style="font-size: 8pt; font-weight: 600; color: #1e293b;">${company.representanteLegal}</div>
            <div style="font-size: 7pt; color: #475569;">${company.cargoRepresentante} • C.I. ${company.cedulaRepresentante}</div>
          </td>

          <!-- Worker Signature -->
          <td style="width: 38%; vertical-align: top; text-align: center; padding: 0 8px;">
            <div style="height: 40px; border-bottom: 1.5px solid #000000; margin-bottom: 4px;"></div>
            <div style="font-size: 7.5pt; font-weight: 800; color: #0f172a;">EL TRABAJADOR</div>
            <div style="font-size: 8pt; font-weight: 600; color: #1e293b;">${employee.fullName}</div>
            <div style="font-size: 7pt; color: #475569;">${employee.cargo} • C.I. ${employee.cedula}</div>
          </td>

          <!-- Wet Thumbprint Box -->
          <td style="width: 24%; vertical-align: top; text-align: center; padding: 0 4px;">
            <div style="width: 76px; height: 86px; border: 1.5px dashed #475569; margin: 0 auto 3px auto; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #ffffff;">
              <span style="font-size: 6.5pt; color: #475569; font-weight: 700; text-transform: uppercase;">Huella Dactilar</span>
              <span style="font-size: 5.5pt; color: #64748b;">Pulgar Derecho</span>
              <span style="font-size: 5pt; color: #94a3b8; margin-top: 3px;">(Tinta Húmeda)</span>
            </div>
            <div style="font-size: 6pt; font-weight: 600; color: #475569;">Soporte Probatorio TSJ</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Prints one or multiple contracts in a single print spool using a hidden iframe.
 * Avoids browser modal restrictions and ensures each contract is on its own page.
 */
export function printBatchContractsDirectly(
  employees: Employee[],
  company: CompanyConfig,
  config: ContractPrintConfig
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!employees || employees.length === 0) {
      resolve(false);
      return;
    }

    try {
      const existingFrame = document.getElementById('contract-batch-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'contract-batch-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        resolve(true);
        return;
      }

      const allContractsHtml = employees
        .map((emp) => generateContractPrintHtml(emp, company, config))
        .join('\n');

      const printDocHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lote de Contratos - ${company.razonSocial}</title>
          <style>
            @page {
              size: letter portrait;
              margin: 12mm 14mm 12mm 14mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: 'Times New Roman', Times, serif;
            }
            .contract-sheet {
              page-break-after: always;
              break-after: page;
            }
            .contract-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>
          ${allContractsHtml}
        </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(printDocHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.print', e);
          window.print();
          resolve(true);
        }
      }, 350);
    } catch (err) {
      console.error('Error during contract batch printing:', err);
      try {
        window.print();
      } catch (e) {
        console.error('window.print also failed:', e);
      }
      resolve(false);
    }
  });
}
