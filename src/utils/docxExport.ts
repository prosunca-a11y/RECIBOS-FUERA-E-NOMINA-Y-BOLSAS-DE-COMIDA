import { BenefitReceipt, CompanyConfig, Employee, GroceryItem } from '../types';
import { formatBs, formatUSD } from './bcv';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a formatted Microsoft Word document (.doc)
 * containing full Office XML schemas, preserving exact tables, margins,
 * headers, legal citations, and thumbprint/signature layout.
 */
export function exportReceiptToWord(receipt: BenefitReceipt, company: CompanyConfig) {
  const isBolsa = receipt.category === 'bolsa_comida';
  const isMedical = receipt.category === 'gastos_medicos';

  const groceryRowsHtml = receipt.groceryItems && receipt.groceryItems.length > 0
    ? receipt.groceryItems
        .map(
          (item, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-size: 10pt;">[  ] ${item.name}</td>
          <td style="border: 1px solid #d1d5db; padding: 6px 10px; font-size: 10pt; text-align: center;">${item.quantity} ${item.unit}</td>
        </tr>`
        )
        .join('')
    : '';

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Recibo de Beneficio Social No Remunerativo</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: letter portrait;
          margin: 2.0cm 2.0cm 2.0cm 2.0cm;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #111827;
          line-height: 1.35;
          font-size: 11pt;
        }
        h1 {
          font-size: 14pt;
          text-align: center;
          font-weight: bold;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 9.5pt;
          text-align: center;
          color: #4b5563;
          margin-bottom: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .section-header {
          background-color: #f8fafc;
          color: #1e293b;
          font-weight: bold;
          padding: 5px 8px;
          font-size: 9.5pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border: 1px solid #cbd5e1;
          border-bottom: 1.5px solid #94a3b8;
        }
        .data-label {
          font-weight: bold;
          color: #475569;
          width: 28%;
          padding: 5px 8px;
          font-size: 9.5pt;
          border-bottom: 1px solid #f1f5f9;
        }
        .data-val {
          color: #0f172a;
          padding: 5px 8px;
          font-size: 9.5pt;
          border-bottom: 1px solid #f1f5f9;
        }
        .highlight-box {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 10px;
          margin: 12px 0;
        }
        .declaration-text {
          font-size: 9pt;
          text-align: justify;
          line-height: 1.4;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-left: 3px solid #64748b;
          background-color: #fafafa;
          padding: 8px 10px;
          margin: 12px 0;
        }
        .signatures-table {
          width: 100%;
          margin-top: 24px;
          border-collapse: collapse;
        }
        .sig-box {
          width: 48%;
          vertical-align: top;
          text-align: center;
          padding: 8px;
        }
        .thumbprint-box {
          width: 100px;
          height: 120px;
          border: 1px dashed #94a3b8;
          margin: 0 auto 6px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8pt;
          color: #64748b;
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; font-size: 9pt; color: #6b7280; margin-bottom: 10px;">
        <strong>COMPROBANTE N°:</strong> ${receipt.receiptNumber} | <strong>FECHA:</strong> ${receipt.issueDate}
      </div>

      <h1>${isBolsa ? 'COMPROBANTE DE RECEPCIÓN DE BENEFICIO EN ESPECIE (BOLSA DE COMIDA)' : 'RECIBO DE BENEFICIO SOCIAL NO REMUNERATIVO'}</h1>
      <div class="subtitle">
        Amparado taxativamente en el Artículo 105, Numeral 2 de la D-LOTTT, Art. 73 RLOT y Sentencia N° 523 TSJ (Caso INDULAC)
      </div>

      <!-- EMPRESA -->
      <table>
        <tr>
          <td colspan="2" class="section-header">1. DATOS DE LA ENTIDAD DE TRABAJO (PATRONO)</td>
        </tr>
        <tr>
          <td class="data-label">Razón Social:</td>
          <td class="data-val"><strong>${company.razonSocial}</strong></td>
        </tr>
        <tr>
          <td class="data-label">R.I.F.:</td>
          <td class="data-val">${company.rif}</td>
        </tr>
        <tr>
          <td class="data-label">Dirección Fiscal:</td>
          <td class="data-val">${company.direccionFiscal}</td>
        </tr>
        <tr>
          <td class="data-label">Representante Legal:</td>
          <td class="data-val">${company.representanteLegal} (C.I. ${company.cedulaRepresentante}) - ${company.cargoRepresentante}</td>
        </tr>
      </table>

      <!-- TRABAJADOR -->
      <table>
        <tr>
          <td colspan="2" class="section-header">2. DATOS DEL TRABAJADOR BENEFICIARIO</td>
        </tr>
        <tr>
          <td class="data-label">Nombres y Apellidos:</td>
          <td class="data-val"><strong>${receipt.employeeName}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Cédula de Identidad:</td>
          <td class="data-val"><strong>${receipt.employeeCedula}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Cargo / Departamento:</td>
          <td class="data-val">${receipt.employeeCargo}</td>
        </tr>
        <tr>
          <td class="data-label">Período de Cobertura:</td>
          <td class="data-val">${receipt.coveragePeriod}</td>
        </tr>
      </table>

      <!-- DETALLE FINANCIERO / CONCEPTO -->
      <table>
        <tr>
          <td colspan="2" class="section-header">3. ESPECIFICACIÓN DEL BENEFICIO Y LIQUIDACIÓN</td>
        </tr>
        <tr>
          <td class="data-label">Denominación del Beneficio:</td>
          <td class="data-val"><strong>${receipt.conceptTitle}</strong></td>
        </tr>
        <tr>
          <td class="data-label">Fundamento Asistencial:</td>
          <td class="data-val">${receipt.conceptDescription}</td>
        </tr>
        ${
          receipt.paymentMethod === 'transferencia_independiente'
            ? `
        <tr>
          <td class="data-label">Método de Dispersión:</td>
          <td class="data-val">Transferencia Bancaria Independiente (Separada de Nómina) - ${receipt.bankName || 'Banco Comercial'}</td>
        </tr>
        <tr>
          <td class="data-label">Nro. de Referencia:</td>
          <td class="data-val"><strong>${receipt.referenceNumber || 'Registrada en extracto independiente'}</strong></td>
        </tr>
        `
            : ''
        }
        ${
          isMedical
            ? `
        <tr>
          <td class="data-label">Factura Fiscal Clínica / Farmacia:</td>
          <td class="data-val">Nro. ${receipt.clinicalInvoiceNumber} (RIF Emisor: ${receipt.clinicalInvoiceRIF}) - Paciente: ${receipt.patientName} (${receipt.patientRelation})</td>
        </tr>
        `
            : ''
        }
      </table>

      ${
        isBolsa && groceryRowsHtml
          ? `
      <table>
        <tr>
          <td colspan="2" class="section-header">RELACIÓN DE VÍVERES ENTREGADOS EN ESPECIE</td>
        </tr>
        <tr style="background-color: #f3f4f6; font-weight: bold;">
          <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: left;">Descripción del Producto</th>
          <th style="border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; width: 25%;">Cantidad / Unidad</th>
        </tr>
        ${groceryRowsHtml}
      </table>
      `
          : ''
      }

      <!-- LIQUIDACIÓN CAMBIARIA BCV - LOW TONER -->
      <table style="border: 1px solid #94a3b8; background-color: #ffffff;">
        <tr>
          <td style="padding: 8px 10px; font-size: 9.5pt; width: 33%;">
            <div style="font-size: 8pt; color: #475569; text-transform: uppercase; font-weight: bold;">Valor en Divisas Pactado</div>
            <div style="font-size: 12pt; font-weight: bold; color: #0f172a;">${formatUSD(receipt.amountUSD)}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 9.5pt; width: 33%; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">
            <div style="font-size: 8pt; color: #475569; text-transform: uppercase; font-weight: bold;">Tasa Oficial BCV (${receipt.issueDate})</div>
            <div style="font-size: 12pt; font-weight: bold; color: #0f172a;">Bs. ${receipt.tasaBCV.toFixed(2)}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 9.5pt; width: 34%;">
            <div style="font-size: 8pt; color: #475569; text-transform: uppercase; font-weight: bold;">Monto Total Liquidado (Bs.)</div>
            <div style="font-size: 12pt; font-weight: bold; color: #15803d;">${formatBs(receipt.amountBs)}</div>
          </td>
        </tr>
      </table>

      <!-- CLÁUSULA DE EXCLUSIÓN SALARIAL -->
      <div class="declaration-text">
        <strong>DECLARACIÓN DE CONFORMIDAD Y EXCLUSIÓN SALARIAL TAXATIVA:</strong><br>
        Yo, <strong>${receipt.employeeName}</strong>, titular de la Cédula de Identidad N° <strong>${receipt.employeeCedula}</strong>, declaro haber recibido de mi patrono <strong>${company.razonSocial}</strong> el beneficio arriba especificado a mi entera y total satisfacción.<br><br>
        De conformidad con lo consagrado taxativamente en el <strong>Artículo 105 de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT)</strong>, el <strong>Artículo 73 del Reglamento de la LOT</strong>, y la jurisprudencia pacífica y reiterada de la <strong>Sala de Casación Social del Tribunal Supremo de Justicia (Sentencia N° 523 de fecha 13 de noviembre de 2025, Caso INDULAC)</strong>, reconozco y acepto de forma expresa e irrevocable que la presente asignación constituye un <strong>BENEFICIO SOCIAL DE CARÁCTER NO REMUNERATIVO</strong> destinado a la protección asistencial de la economía y la alimentación familiar. En consecuencia, <strong>NO CONSTITUYE SALARIO</strong>, no forma parte del salario normal ni integral, y se encuentra <strong>ESTRICTAMENTE EXCLUIDO</strong> de la base de cálculo para prestaciones sociales (garantía o retroactividad según Art. 142 LOTTT), utilidades, vacaciones, bono vacacional, horas extraordinarias, días feriados, indemnizaciones por terminación o cualquier otra acreencia laboral o contribución parafiscal (IVSS, FAOV, INCES).
      </div>

      <!-- FIRMAS Y HUELLA -->
      <table class="signatures-table">
        <tr>
          <td class="sig-box">
            <div style="margin-top: 40px; border-top: 1px solid #475569; padding-top: 5px; width: 85%; margin-left: auto; margin-right: auto;">
              <strong>${receipt.employeeName}</strong><br>
              C.I. N° ${receipt.employeeCedula}<br>
              <span style="font-size: 8.5pt; color: #475569;">Firma del Trabajador Beneficiario</span>
            </div>
          </td>
          <td class="sig-box">
            <div style="width: 100px; height: 120px; border: 1px dashed #94a3b8; margin: 0 auto; text-align: center; vertical-align: middle; background-color: #ffffff;">
              <br><br>
              <span style="font-size: 8pt; color: #64748b;">HUELLA DACTILAR<br>(PULGAR DERECHO)</span>
            </div>
            <div style="margin-top: 5px; font-size: 8pt; color: #475569;">
              Estampa de Huella Dactilar Húmeda
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 25px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8pt; color: #6b7280; text-align: center;">
        Comprobante emitido con fines probatorios laborales y deducibilidad fiscal ante el SENIAT conforme al Art. 27 Numeral 22 de la Ley de ISLR.<br>
        Expediente Digital Resguardado en Bóveda Tríada de Control. Código de Autenticidad: ${receipt.id.toUpperCase()}-${receipt.receiptNumber}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  downloadBlob(blob, `Recibo_${receipt.receiptNumber}_${receipt.employeeCedula}.doc`);
}

function formatSpanishContractDate(dateStr?: string, ciudad = 'Caracas'): string {
  if (!dateStr) {
    return `En <strong>${ciudad}</strong>, a los ________ días del mes de ____________________ de 2026.`;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return `En <strong>${ciudad}</strong>, a los ________ días del mes de ____________________ de 2026.`;
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

function buildContractHtmlBody(
  employee: Employee,
  company: CompanyConfig,
  tipoBeneficio: 'bolsa_comida' | 'bono_transferencia' | string = 'bolsa_comida',
  periodicidad: string = 'MENSUAL',
  diasEntrega: number = 5,
  fechaDocumento?: string,
  montoUSD?: number
): string {
  const isBolsa = tipoBeneficio === 'bolsa_comida';
  const fechaTexto = formatSpanishContractDate(fechaDocumento, company.ciudad);
  const montoTexto = montoUSD && montoUSD > 0 ? ` (con una asignación o valor estimado de USD $${montoUSD.toFixed(2)} o su equivalente al cambio oficial BCV)` : '';

  return `
    <div class="contract-doc-section">
      <h1>ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO</h1>
      <div class="subhead">
        OTORGAMIENTO DE BENEFICIO SOCIAL NO REMUNERATIVO ${isBolsa ? 'DE PROVISIÓN DE ALIMENTOS EN ESPECIE (BOLSAS DE COMIDA)' : 'DE ALIMENTACIÓN COMPLEMENTARIA'}<br>
        (Amparado taxativamente en el Artículo 105, Numeral 2 de la LOTTT y Art. 73 del RLOT)
      </div>

      <p>
        Entre la entidad de trabajo <strong>${company.razonSocial}</strong>, sociedad mercantil debidamente domiciliada en <strong>${company.ciudad}</strong>, inscrita por ante el <strong>${company.registroMercantil}</strong>, bajo el Registro de Información Fiscal (R.I.F.) N° <strong>${company.rif}</strong>, representada en este acto por el ciudadano <strong>${company.representanteLegal}</strong>, titular de la Cédula de Identidad N° <strong>${company.cedulaRepresentante}</strong>, en su carácter de <strong>${company.cargoRepresentante}</strong>, en lo sucesivo denominada <strong>"LA EMPRESA"</strong>, por una parte; y por la otra, el ciudadano(a) <strong>${employee.fullName}</strong>, titular de la Cédula de Identidad N° <strong>${employee.cedula}</strong>, de nacionalidad <strong>${employee.nacionalidad}</strong>, de estado civil <strong>${employee.estadoCivil}</strong>, domiciliado en <strong>${employee.direccion}</strong>, quien desempeña el cargo de <strong>${employee.cargo}</strong> en el área de <strong>${employee.departamento}</strong>, en lo sucesivo denominado(a) <strong>"EL TRABAJADOR"</strong>, se ha convenido en suscribir de mutuo acuerdo la presente <strong>ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO</strong>, la cual se regirá por las siguientes cláusulas:
      </p>

      <p>
        <span class="clause-title">PRIMERA (OBJETO):</span> En el marco de la protección integral a la familia y con el propósito de coadyuvar a la seguridad alimentaria y bienestar socioeconómico del TRABAJADOR y su núcleo familiar directo frente a las contingencias de la economía nacional, LA EMPRESA decide otorgar de manera directa y voluntaria un beneficio social no remunerativo ${
          isBolsa
            ? 'consistente en una (1) BOLSA / CESTA DE PRODUCTOS ALIMENTICIOS de primera necesidad e higiene básica'
            : 'consistente en una ayuda complementaria de alimentación mensual liquidada mediante dispersión bancaria independiente'
        }${montoTexto}.
      </p>

      <p>
        <span class="clause-title">SEGUNDA (PERIODICIDAD Y LUGAR DE ENTREGA):</span> ${
          isBolsa
            ? `La entrega de los productos alimenticios se efectuará con una periodicidad ${periodicidad}, dentro de los primeros ${diasEntrega} días de cada período, directamente en las instalaciones del centro de trabajo de LA EMPRESA. LA EMPRESA entregará junto con los víveres una relación descriptiva de los productos que integran la dotación para su correspondiente revisión y cotejo.`
            : `El pago complementario se efectuará con periodicidad ${periodicidad}, mediante transferencia bancaria efectuada desde cuentas corporativas independientes de la cuenta ordinaria de nómina.`
        }
      </p>

      <p>
        <span class="clause-title">TERCERA (NATURALEZA JURÍDICA Y EXCLUSIÓN SALARIAL TAXATIVA):</span> Ambas partes declaran, reconocen y aceptan de manera expresa, libre, consciente e irrevocable que el presente beneficio ${
          isBolsa ? 'en especie' : 'económico complementario'
        } constituye taxativamente un <strong>BENEFICIO SOCIAL DE CARÁCTER NO REMUNERATIVO</strong>, plenamente fundamentado en el <strong>Artículo 105, Numeral 2 de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT)</strong>, en concordancia con el <strong>Artículo 73 del Reglamento de la Ley Orgánica del Trabajo (RLOT)</strong> y la doctrina sentada en la <strong>Sentencia N° 523 de la Sala de Casación Social del Tribunal Supremo de Justicia (TSJ)</strong>. En consecuencia, las partes ratifican que:
        <br>
        a) <strong>NO TIENE CARÁCTER SALARIAL</strong> y no constituye retribución o contraprestación directa por la labor prestada;<br>
        b) <strong>NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL</strong> del TRABAJADOR;<br>
        c) Queda <strong>ESTRICTAMENTE EXCLUIDO</strong> de la base de cálculo de las prestaciones sociales (tanto la garantía trimestral como el cálculo retroactivo del Art. 142 LOTTT), utilidades de fin de año, bonificación vacacional, vacaciones anuales, horas extraordinarias, bono nocturno, recargos por feriados o descansos, e indemnizaciones por terminación de la relación de trabajo;<br>
        d) No integra la base de cálculo de las contribuciones parafiscales al Seguro Social Obligatorio (IVSS), Fondo de Ahorro Obligatorio para la Vivienda (FAOV) ni Instituto Nacional de Capacitación y Educación Socialista (INCES).
      </p>

      <p>
        <span class="clause-title">CUARTA (CARÁCTER ASISTENCIAL Y ADECUACIONES OPERATIVAS):</span> El presente beneficio reviste carácter estrictamente asistencial y de protección a la economía del hogar. ${
          isBolsa
            ? 'LA EMPRESA se reserva el derecho de adecuar la composición o sustituir marcas de los productos que integran la bolsa en función de la disponibilidad y abastecimiento del mercado, garantizando siempre la idoneidad y calidad nutricional de los víveres, sin que ello pueda interpretarse bajo ninguna circunstancia como desmejora de las condiciones de trabajo.'
            : 'LA EMPRESA revisará periódicamente el monto asignado en función de la realidad socioeconómica y los índices oficiales.'
        }
      </p>

      <p>
        <span class="clause-title">QUINTA (OBLIGACIÓN DE SUSCRIPCIÓN DE COMPROBANTE Y HUELLA):</span> EL TRABAJADOR asume la obligación ineludible de suscribir el comprobante o recibo físico de recepción ${
          isBolsa ? 'al momento de recibir cada dotación de alimentos' : 'al momento de la liquidación del beneficio'
        }, estampando su firma manuscrita y su huella dactilar húmeda (pulgar derecho), ratificando en cada entrega la recepción a satisfacción y la naturaleza no salarial del beneficio.
      </p>

      <p>
        <span class="clause-title">SEXTA (VIGENCIA Y ADHESIÓN AL CONTRATO):</span> La presente Adenda entra en vigencia a partir de la fecha de su suscripción y se adhiere de forma permanente al Contrato Individual de Trabajo suscrito previamente entre las partes, manteniendo sus demás cláusulas plenamente vigentes e inalteradas.
      </p>

      <p>
        Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, haciéndosele entrega al TRABAJADOR de un ejemplar original debidamente sellado y firmado, en estricto cumplimiento de los Artículos 58 y 59 de la LOTTT.
      </p>

      <p style="text-indent: 0; margin-top: 20px;">
        ${fechaTexto}
      </p>

      <table class="signatures-table">
        <tr>
          <td class="sig-cell">
            <div style="margin-top: 50px; border-top: 1.5px solid #111827; padding-top: 6px; width: 85%; margin-left: auto; margin-right: auto;">
              <strong>POR LA EMPRESA</strong><br>
              <strong>${company.representanteLegal}</strong><br>
              C.I. N° ${company.cedulaRepresentante}<br>
              ${company.cargoRepresentante}
            </div>
          </td>
          <td class="sig-cell">
            <div style="margin-top: 50px; border-top: 1.5px solid #111827; padding-top: 6px; width: 85%; margin-left: auto; margin-right: auto;">
              <strong>EL TRABAJADOR</strong><br>
              <strong>${employee.fullName}</strong><br>
              C.I. N° ${employee.cedula}<br>
              ${employee.cargo}
            </div>
            <div style="margin-top: 12px; font-size: 8.5pt; color: #4b5563; font-weight: bold;">
              Huella Dactilar Húmeda (Pulgar Derecho)
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Generates and downloads the official Adenda to the individual employment contract in Word (.doc)
 * amparando la entrega de bolsas de comida o bonos de alimentación no salariales.
 */
export function exportContractAdendaToWord(
  employee: Employee,
  company: CompanyConfig,
  tipoBeneficio: 'bolsa_comida' | 'bono_transferencia' | string = 'bolsa_comida',
  periodicidad: string = 'MENSUAL',
  diasEntrega: number = 5,
  fechaDocumento?: string,
  montoUSD?: number
) {
  const isBolsa = tipoBeneficio === 'bolsa_comida';
  const bodyHtml = buildContractHtmlBody(employee, company, tipoBeneficio, periodicidad, diasEntrega, fechaDocumento, montoUSD);

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Adenda al Contrato Individual de Trabajo</title>
      <style>
        @page {
          size: letter portrait;
          margin: 2.0cm 2.0cm 2.0cm 2.0cm;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #111827;
          line-height: 1.4;
          font-size: 10.5pt;
          text-align: justify;
        }
        h1 {
          font-size: 13.5pt;
          text-align: center;
          font-weight: bold;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .subhead {
          font-size: 9.5pt;
          text-align: center;
          color: #374151;
          margin-bottom: 18px;
          font-weight: bold;
        }
        p {
          margin-bottom: 11px;
          text-indent: 20px;
        }
        .clause-title {
          font-weight: bold;
          text-decoration: underline;
        }
        .signatures-table {
          width: 100%;
          margin-top: 30px;
          border-collapse: collapse;
        }
        .sig-cell {
          width: 50%;
          vertical-align: top;
          text-align: center;
          padding: 8px;
        }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  downloadBlob(blob, `Contrato_Adenda_${employee.cedula}_${isBolsa ? 'BolsaComida' : 'BonoSocial'}.doc`);
}

/**
 * Generates and downloads a multi-contract Word (.doc) document for a batch of employees.
 * Each employee's contract begins on a new page using Word page breaks.
 */
export function exportBatchContractAdendasToWord(
  employees: Employee[],
  company: CompanyConfig,
  tipoBeneficio: 'bolsa_comida' | 'bono_transferencia' | string = 'bolsa_comida',
  periodicidad: string = 'MENSUAL',
  diasEntrega: number = 5,
  fechaDocumento?: string,
  montoUSD?: number
) {
  if (!employees || employees.length === 0) return;

  const contractsHtml = employees
    .map((emp, idx) => {
      const isLast = idx === employees.length - 1;
      const contractBody = buildContractHtmlBody(
        emp,
        company,
        tipoBeneficio,
        periodicidad,
        diasEntrega,
        fechaDocumento,
        montoUSD
      );
      const pageBreak = !isLast ? '<br clear="all" style="page-break-before:always; mso-break-type:page-break" />' : '';
      return `${contractBody}\n${pageBreak}`;
    })
    .join('\n');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Lote de Adendas al Contrato de Trabajo - ${company.razonSocial}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 2.0cm 2.0cm 2.0cm 2.0cm;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #111827;
          line-height: 1.4;
          font-size: 10.5pt;
          text-align: justify;
        }
        h1 {
          font-size: 13.5pt;
          text-align: center;
          font-weight: bold;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .subhead {
          font-size: 9.5pt;
          text-align: center;
          color: #374151;
          margin-bottom: 18px;
          font-weight: bold;
        }
        p {
          margin-bottom: 11px;
          text-indent: 20px;
        }
        .clause-title {
          font-weight: bold;
          text-decoration: underline;
        }
        .signatures-table {
          width: 100%;
          margin-top: 30px;
          border-collapse: collapse;
        }
        .sig-cell {
          width: 50%;
          vertical-align: top;
          text-align: center;
          padding: 8px;
        }
      </style>
    </head>
    <body>
      ${contractsHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  downloadBlob(blob, `Lote_${employees.length}_Adendas_Contratos_${company.rif}.doc`);
}

/**
 * Exports physical grocery delivery receipt specifically for food basket delivery
 */
export function exportFoodDeliveryReceiptToWord(receipt: BenefitReceipt, company: CompanyConfig) {
  exportReceiptToWord(receipt, company);
}

/**
 * Exports a batch of multiple receipts into a single Word document (.doc)
 * with page breaks separating each receipt, allowing printing or editing all at once.
 */
export function exportBatchReceiptsToWord(
  receipts: BenefitReceipt[],
  company: CompanyConfig,
  filename = 'Lote_Comprobantes'
) {
  if (!receipts || receipts.length === 0) return;

  const receiptHtmlParts = receipts.map((receipt, idx) => {
    const isBolsa = receipt.category === 'bolsa_comida';
    const isMedical = receipt.category === 'gastos_medicos';

    const groceryRowsHtml =
      receipt.groceryItems && receipt.groceryItems.length > 0
        ? receipt.groceryItems
            .map(
              (item, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
              <td style="border: 1px solid #d1d5db; padding: 5px 8px; font-size: 9pt;">[  ] ${item.name}</td>
              <td style="border: 1px solid #d1d5db; padding: 5px 8px; font-size: 9pt; text-align: center;">${item.quantity} ${item.unit}</td>
            </tr>`
            )
            .join('')
        : '';

    const isLast = idx === receipts.length - 1;
    const pageBreak = !isLast ? '<br clear="all" style="page-break-before:always; mso-break-type:page-break" />' : '';

    return `
      <div style="margin-bottom: 20px;">
        <div style="text-align: right; font-size: 9pt; color: #6b7280; margin-bottom: 8px;">
          <strong>COMPROBANTE N°:</strong> ${receipt.receiptNumber} | <strong>FECHA:</strong> ${receipt.issueDate}
        </div>

        <h1>${isBolsa ? 'COMPROBANTE DE RECEPCIÓN DE BENEFICIO EN ESPECIE (BOLSA DE COMIDA)' : 'RECIBO DE BENEFICIO SOCIAL NO REMUNERATIVO'}</h1>
        <div class="subtitle">
          Amparado taxativamente en el Artículo 105, Numeral 2 de la D-LOTTT, Art. 73 RLOT y Sentencia N° 523 TSJ (Caso INDULAC)
        </div>

        <table>
          <tr>
            <td colspan="2" class="section-header">1. DATOS DE LA ENTIDAD DE TRABAJO (PATRONO)</td>
          </tr>
          <tr>
            <td class="data-label">Razón Social:</td>
            <td class="data-val"><strong>${company.razonSocial}</strong></td>
          </tr>
          <tr>
            <td class="data-label">R.I.F.:</td>
            <td class="data-val">${company.rif}</td>
          </tr>
          <tr>
            <td class="data-label">Representante Legal:</td>
            <td class="data-val">${company.representanteLegal} (C.I. ${company.cedulaRepresentante})</td>
          </tr>
        </table>

        <table>
          <tr>
            <td colspan="2" class="section-header">2. DATOS DEL TRABAJADOR BENEFICIARIO</td>
          </tr>
          <tr>
            <td class="data-label">Nombres y Apellidos:</td>
            <td class="data-val"><strong>${receipt.employeeName}</strong></td>
          </tr>
          <tr>
            <td class="data-label">Cédula de Identidad:</td>
            <td class="data-val"><strong>${receipt.employeeCedula}</strong></td>
          </tr>
          <tr>
            <td class="data-label">Cargo / Departamento:</td>
            <td class="data-val">${receipt.employeeCargo}</td>
          </tr>
          <tr>
            <td class="data-label">Período de Cobertura:</td>
            <td class="data-val">${receipt.coveragePeriod}</td>
          </tr>
        </table>

        <table>
          <tr>
            <td colspan="2" class="section-header">3. ESPECIFICACIÓN DEL BENEFICIO</td>
          </tr>
          <tr>
            <td class="data-label">Denominación:</td>
            <td class="data-val"><strong>${receipt.conceptTitle}</strong></td>
          </tr>
          <tr>
            <td class="data-label">Fundamento Asistencial:</td>
            <td class="data-val">${receipt.conceptDescription}</td>
          </tr>
          ${
            receipt.paymentMethod === 'transferencia_independiente'
              ? `
          <tr>
            <td class="data-label">Vía Bancaria:</td>
            <td class="data-val">Transferencia Independiente - ${receipt.bankName || 'Banco Comercial'} - Ref: ${receipt.referenceNumber || 'Extracto'}</td>
          </tr>`
              : ''
          }
        </table>

        ${
          isBolsa && groceryRowsHtml
            ? `
        <table>
          <tr>
            <td colspan="2" class="section-header">RELACIÓN DE VÍVERES ENTREGADOS EN ESPECIE</td>
          </tr>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: left;">Producto</th>
            <th style="border: 1px solid #d1d5db; padding: 5px 8px; text-align: center; width: 25%;">Cantidad / Unidad</th>
          </tr>
          ${groceryRowsHtml}
        </table>`
            : ''
        }

        <!-- LIQUIDACIÓN CAMBIARIA BCV - LOW TONER -->
        <table style="border: 1px solid #94a3b8; background-color: #ffffff;">
          <tr>
            <td style="padding: 6px 8px; font-size: 9pt; width: 33%;">
              <div style="font-size: 7.5pt; color: #475569; text-transform: uppercase; font-weight: bold;">Valor Ref. USD</div>
              <div style="font-size: 11.5pt; font-weight: bold; color: #0f172a;">${formatUSD(receipt.amountUSD)}</div>
            </td>
            <td style="padding: 6px 8px; font-size: 9pt; width: 33%; text-align: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">
              <div style="font-size: 7.5pt; color: #475569; text-transform: uppercase; font-weight: bold;">Tasa Oficial BCV</div>
              <div style="font-size: 11pt; font-weight: bold; color: #0f172a;">Bs. ${receipt.tasaBCV.toFixed(2)}</div>
            </td>
            <td style="padding: 6px 8px; font-size: 9pt; width: 33%; text-align: right;">
              <div style="font-size: 7.5pt; color: #475569; text-transform: uppercase; font-weight: bold;">Total en Bolívares</div>
              <div style="font-size: 11.5pt; font-weight: bold; color: #15803d;">${formatBs(receipt.amountBs)}</div>
            </td>
          </tr>
        </table>

        <div class="declaration-text">
          <strong>CLÁUSULA DE EXCLUSIÓN SALARIAL (ART. 105 LOTTT - SENTENCIA N° 523 TSJ):</strong>
          El TRABAJADOR declara recibir a su entera conformidad el presente beneficio de carácter estrictamente social y no remunerativo, convenido como ayuda para su núcleo familiar. Se deja constancia expresa de que este beneficio NO TIENE CARÁCTER SALARIAL, NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL, y en ningún caso computará para la liquidación de Prestaciones Sociales, Vacaciones, Bono Vacacional, Utilidades ni indemnizaciones derivadas de la relación de trabajo.
        </div>

        <table class="signatures-table">
          <tr>
            <td class="sig-box">
              <div style="margin-top: 35px; border-top: 1px solid #475569; padding-top: 5px; width: 85%; margin-left: auto; margin-right: auto;">
                <strong>POR LA ENTIDAD DE TRABAJO</strong><br>
                ${company.representanteLegal}<br>
                <span style="font-size: 7.5pt; color: #475569;">${company.cargoRepresentante} (C.I. ${company.cedulaRepresentante})</span>
              </div>
            </td>
            <td class="sig-box">
              <div style="margin-top: 35px; border-top: 1px solid #475569; padding-top: 5px; width: 85%; margin-left: auto; margin-right: auto;">
                <strong>EL TRABAJADOR</strong><br>
                ${receipt.employeeName}<br>
                <span style="font-size: 7.5pt; color: #475569;">C.I. ${receipt.employeeCedula}</span>
              </div>
            </td>
            <td style="width: 25%; text-align: center; vertical-align: bottom;">
              <div class="thumbprint-box">
                HUELLA DACTILAR<br>PULGAR DERECHO<br><span style="font-size: 7pt; color: #64748b;">(Tinta Húmeda)</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
      ${pageBreak}
    `;
  });

  const fullWordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Lote de Comprobantes - ${company.razonSocial}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 1.8cm 1.8cm 1.8cm 1.8cm;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #111827;
          line-height: 1.3;
          font-size: 10pt;
        }
        h1 {
          font-size: 12pt;
          text-align: center;
          font-weight: bold;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 8.5pt;
          text-align: center;
          color: #4b5563;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .section-header {
          background-color: #f8fafc;
          color: #1e293b;
          font-weight: bold;
          padding: 4px 8px;
          font-size: 9pt;
          text-transform: uppercase;
          border: 1px solid #cbd5e1;
          border-bottom: 1.5px solid #94a3b8;
        }
        .data-label {
          font-weight: bold;
          color: #475569;
          width: 28%;
          padding: 3px 6px;
          font-size: 8.5pt;
          border-bottom: 1px solid #e5e7eb;
        }
        .data-val {
          color: #0f172a;
          padding: 3px 6px;
          font-size: 8.5pt;
          border-bottom: 1px solid #e5e7eb;
        }
        .declaration-text {
          font-size: 8pt;
          text-align: justify;
          line-height: 1.35;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-left: 2.5px solid #64748b;
          background-color: #fafafa;
          padding: 6px 8px;
          margin: 10px 0;
        }
        .signatures-table {
          width: 100%;
          margin-top: 15px;
          border-collapse: collapse;
        }
        .sig-box {
          width: 40%;
          vertical-align: top;
          text-align: center;
          padding: 6px;
        }
        .thumbprint-box {
          width: 95px;
          height: 110px;
          border: 1px dashed #94a3b8;
          margin: 0 auto;
          text-align: center;
          padding-top: 18px;
          font-size: 7.5pt;
          color: #64748b;
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      ${receiptHtmlParts.join('')}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + fullWordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  downloadBlob(blob, `${filename}_${company.rif}.doc`);
}

