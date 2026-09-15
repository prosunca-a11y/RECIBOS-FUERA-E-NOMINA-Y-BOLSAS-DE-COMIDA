import * as XLSX from 'xlsx';
import { BenefitReceipt, CompanyConfig, CorporateFoodPurchaseInvoice, Employee } from '../types';

export function exportReceiptsToExcel(
  receipts: BenefitReceipt[],
  company: CompanyConfig,
  employees: Employee[]
) {
  const empMap = new Map(employees.map((e) => [e.id, e]));

  // Sheet 1: Libro de Beneficios Sociales No Remunerativos
  const dataLibro = receipts.map((r, index) => {
    const emp = empMap.get(r.employeeId);
    return {
      'N°': index + 1,
      'Nro. Comprobante': r.receiptNumber,
      'Fecha Emisión': r.issueDate,
      'Período': r.coveragePeriod,
      'Cédula Trabajador': r.employeeCedula,
      'Nombre Trabajador': r.employeeName,
      'Cargo': r.employeeCargo,
      'Departamento': emp?.departamento || 'General',
      'Categoría Beneficio': r.category,
      'Concepto Legal': r.conceptTitle,
      'Monto USD': r.amountUSD,
      'Tasa BCV': r.tasaBCV,
      'Monto Total Bs.': r.amountBs,
      'Método de Pago': r.paymentMethod,
      'Banco Destino': r.bankName || 'N/A',
      'Nro. Referencia Bancaria': r.referenceNumber || 'N/A',
      'Factura Médica/Clínica': r.clinicalInvoiceNumber || 'N/A',
      'RIF Clínica': r.clinicalInvoiceRIF || 'N/A',
      'Estatus Tríada': r.triadStatus.toUpperCase(),
      'Firma Manuscrita': r.hasPhysicalSignature ? 'SÍ' : 'PENDIENTE',
      'Huella Dactilar Húmeda': r.hasWetThumbprint ? 'SÍ' : 'PENDIENTE',
      'Salario Base Bs.': r.salarioBaseBsAtTime,
      'Índice Desalarización (%)': `${Math.round(r.desalarizationRiskRatio * 100)}%`,
      'Nivel de Riesgo': r.riskLevel.toUpperCase(),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(dataLibro);

  // Set column widths
  ws1['!cols'] = [
    { wch: 5 },  // N
    { wch: 16 }, // Comprobante
    { wch: 12 }, // Fecha
    { wch: 16 }, // Periodo
    { wch: 15 }, // Cedula
    { wch: 30 }, // Nombre
    { wch: 25 }, // Cargo
    { wch: 20 }, // Depto
    { wch: 25 }, // Categoria
    { wch: 45 }, // Concepto
    { wch: 12 }, // USD
    { wch: 12 }, // Tasa
    { wch: 16 }, // Monto Bs
    { wch: 25 }, // Metodo
    { wch: 20 }, // Banco
    { wch: 22 }, // Ref
    { wch: 18 }, // Factura
    { wch: 16 }, // RIF
    { wch: 16 }, // Triada
    { wch: 16 }, // Firma
    { wch: 16 }, // Huella
    { wch: 16 }, // Salario
    { wch: 16 }, // Indice
    { wch: 12 }, // Riesgo
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Libro de Beneficios LOTTT');

  // Sheet 2: Resumen Ejecutivo
  const totalBs = receipts.reduce((acc, r) => acc + r.amountBs, 0);
  const totalUSD = receipts.reduce((acc, r) => acc + r.amountUSD, 0);
  const totalArchivados = receipts.filter((r) => r.triadStatus === 'archivado').length;
  const totalConHuella = receipts.filter((r) => r.hasWetThumbprint).length;
  const totalPendientesHuella = receipts.length - totalConHuella;

  const dataResumen = [
    { Parámetro: 'Razón Social', Valor: company.razonSocial },
    { Parámetro: 'R.I.F.', Valor: company.rif },
    { Parámetro: 'Dirección Fiscal', Valor: company.direccionFiscal },
    { Parámetro: 'Tasa BCV Referencial', Valor: `Bs. ${company.tasaBCV.toFixed(2)}` },
    { Parámetro: 'Total Comprobantes Emitidos', Valor: receipts.length },
    { Parámetro: 'Monto Total Desembolsado (USD)', Valor: totalUSD },
    { Parámetro: 'Monto Total Desembolsado (Bs.)', Valor: totalBs },
    { Parámetro: 'Expedientes Archivados con Firma y Huella', Valor: totalArchivados },
    { Parámetro: 'Comprobantes con Huella Húmeda Registrada', Valor: totalConHuella },
    { Parámetro: 'Comprobantes Pendientes de Huella Húmeda', Valor: totalPendientesHuella },
    { Parámetro: 'Fundamento Legal Exclusión Salarial', Valor: 'LOTTT Art. 105 / Sentencia 523 TSJ' },
    { Parámetro: 'Fundamento Deducibilidad Fiscal', Valor: 'Ley de ISLR Art. 27 Numeral 22' },
  ];

  const ws2 = XLSX.utils.json_to_sheet(dataResumen);
  ws2['!cols'] = [{ wch: 35 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen de Auditoría');

  XLSX.writeFile(wb, `Libro_Beneficios_No_Salariales_${company.rif}.xlsx`);
}

export function exportSeniatAuditToExcel(
  invoices: CorporateFoodPurchaseInvoice[],
  receipts: BenefitReceipt[],
  company: CompanyConfig
) {
  const foodReceipts = receipts.filter((r) => r.category === 'bolsa_comida');
  const totalBolsasCompradas = invoices.reduce((acc, inv) => acc + inv.totalBasketsCovered, 0);
  const totalBolsasEntregadas = foodReceipts.length;
  const totalBolsasConFirmaHuella = foodReceipts.filter((r) => r.hasWetThumbprint).length;
  const diferenciaSinSoporte = Math.max(0, totalBolsasCompradas - totalBolsasConFirmaHuella);

  const wb = XLSX.utils.book_new();

  // Tab 1: Conciliación Compras vs Entregas
  const dataConciliacion = [
    {
      'Métrica de Control SENIAT': 'Total Bolsas Compradas en Facturas Fiscales',
      'Cantidad': totalBolsasCompradas,
      'Observación / Requisito Art. 91 LISLR': 'Soportado en facturas de proveedores con RIF y control fiscal',
    },
    {
      'Métrica de Control SENIAT': 'Total Bolsas Entregadas a Trabajadores',
      'Cantidad': totalBolsasEntregadas,
      'Observación / Requisito Art. 91 LISLR': 'Registradas en la plataforma con comprobante individual',
    },
    {
      'Métrica de Control SENIAT': 'Bolsas con Firma y Huella Húmeda Física',
      'Cantidad': totalBolsasConFirmaHuella,
      'Observación / Requisito Art. 91 LISLR': '100% Blindadas y deducibles de ISLR conforme al Art. 27 Num. 22',
    },
    {
      'Métrica de Control SENIAT': 'Riesgo de Rechazo de Deducción (Bolsas sin Huella)',
      'Cantidad': diferenciaSinSoporte,
      'Observación / Requisito Art. 91 LISLR': diferenciaSinSoporte === 0
        ? 'CONCILIACIÓN PERFECTA: Cero riesgo tributario'
        : 'ALERTA: Se requiere recolectar huellas físicas antes de auditoría',
    },
  ];
  const ws1 = XLSX.utils.json_to_sheet(dataConciliacion);
  ws1['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Conciliación SENIAT');

  // Tab 2: Facturas Fiscales de Compra
  const dataInvoices = invoices.map((inv, idx) => ({
    'N°': idx + 1,
    'Nro. Factura Fiscal': inv.invoiceNumber,
    'Proveedor': inv.providerName,
    'RIF Proveedor': inv.providerRIF,
    'Fecha Factura': inv.invoiceDate,
    'Bolsas Amparadas': inv.totalBasketsCovered,
    'Monto Total USD': inv.totalAmountUSD,
    'Monto Total Bs.': inv.totalAmountBs,
    'Descripción Mercancía': inv.itemsDescription,
    'Control SENIAT Válido': inv.hasFiscalControlSENIAT ? 'SÍ' : 'NO',
  }));
  const ws2 = XLSX.utils.json_to_sheet(dataInvoices);
  ws2['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Facturas Compras Víveres');

  // Tab 3: Entregas Físicas a Trabajadores
  const dataEntregas = foodReceipts.map((r, idx) => ({
    'N°': idx + 1,
    'Comprobante': r.receiptNumber,
    'Fecha Entrega': r.issueDate,
    'Trabajador': r.employeeName,
    'Cédula': r.employeeCedula,
    'Cargo': r.employeeCargo,
    'Valor Referencial USD': r.amountUSD,
    'Valor Referencial Bs.': r.amountBs,
    'Firma Manuscrita': r.hasPhysicalSignature ? 'SÍ' : 'PENDIENTE',
    'Huella Húmeda': r.hasWetThumbprint ? 'SÍ' : 'PENDIENTE',
    'Estatus Tríada': r.triadStatus.toUpperCase(),
  }));
  const ws3 = XLSX.utils.json_to_sheet(dataEntregas);
  ws3['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Entregas a Trabajadores');

  XLSX.writeFile(wb, `Auditoria_SENIAT_Conciliacion_ISLR_${company.rif}.xlsx`);
}
