import React from 'react';
import { BenefitReceipt, CompanyConfig, CorporateFoodPurchaseInvoice, Employee } from '../types';
import { formatBs, formatUSD, calculateDesalarizationRisk } from '../utils/bcv';
import { exportReceiptsToExcel } from '../utils/excelExport';
import {
  FileText,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Download,
  PlusCircle,
  FileCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface DashboardProps {
  receipts: BenefitReceipt[];
  company: CompanyConfig;
  employees: Employee[];
  invoices: CorporateFoodPurchaseInvoice[];
  onNavigateTab: (tab: string) => void;
  onSelectReceipt: (receipt: BenefitReceipt) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  receipts,
  company,
  employees,
  invoices,
  onNavigateTab,
  onSelectReceipt,
}) => {
  const companyReceipts = receipts.filter((r) => !r.companyId || r.companyId === company.id);
  const companyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);
  const companyInvoices = invoices.filter((i) => !i.companyId || i.companyId === company.id);

  const totalUSD = companyReceipts.reduce((sum, r) => sum + r.amountUSD, 0);
  const totalBs = companyReceipts.reduce((sum, r) => sum + r.amountBs, 0);
  const foodBasketsCount = companyReceipts.filter((r) => r.category === 'bolsa_comida').length;
  const withWetThumbprint = companyReceipts.filter((r) => r.hasWetThumbprint).length;
  const pendingThumbprint = companyReceipts.length - withWetThumbprint;

  // Calculate average desalarization ratio
  const avgGamma =
    companyReceipts.length > 0
      ? companyReceipts.reduce((acc, r) => acc + r.desalarizationRiskRatio, 0) / companyReceipts.length
      : 0;
  const avgPercentage = Math.round(avgGamma * 100);

  const riskBadge =
    avgGamma <= 0.40
      ? { label: 'Riesgo Bajo (Zona Segura)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
      : avgGamma <= 0.60
      ? { label: 'Riesgo Moderado', color: 'text-amber-700 bg-amber-50 border-amber-300' }
      : { label: 'Riesgo Crítico (>60%)', color: 'text-rose-700 bg-rose-50 border-rose-300' };

  return (
    <div className="space-y-6">
      {/* Top Banner with Legal Shield Notice - Pastel Professional Theme */}
      <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/50 to-slate-50 border border-indigo-100/90 text-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-800 text-xs font-semibold border border-indigo-200/80 mb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
            <span>Blindaje Jurídico Laboral & Fiscal Venezolano</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Control de Beneficios No Salariales y Bolsas de Comida
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed">
            Plataforma estructurada conforme al <strong className="text-slate-800">Artículo 105 de la LOTTT</strong>, la jurisprudencia del TSJ (<strong className="text-slate-800">Sentencia N° 523 / Caso INDULAC</strong>) y los criterios de deducibilidad del <strong className="text-slate-800">SENIAT (Art. 27 LISLR)</strong> para sustentar pagos en divisas y entregas en especie con soporte probatorio inexpugnable.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              id="btn-dash-new-receipt"
              onClick={() => onNavigateTab('receipts')}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Emitir Recibo de Bono</span>
            </button>
            <button
              id="btn-dash-food-basket"
              onClick={() => onNavigateTab('food-basket')}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Entregar Bolsa de Comida</span>
            </button>
            <button
              id="btn-dash-export-excel"
              onClick={() => exportReceiptsToExcel(companyReceipts, company, companyEmployees)}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Libro en Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Comprobantes</span>
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {receipts.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Registrados en Bóveda Tríada
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monto Desembolsado</span>
            <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 font-mono">
              {formatUSD(totalUSD)}
            </div>
            <p className="text-[11px] font-semibold text-emerald-800 font-mono mt-0.5">
              {formatBs(totalBs)} al BCV
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Bolsas Entregadas</span>
            <div className="p-2 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {foodBasketsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dotaciones en especie Art. 105 #2
            </p>
          </div>
        </div>

        {/* KPI 4: Tríada de Control */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Control de Huella</span>
            <div className={`p-2 rounded-lg border ${pendingThumbprint === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono">
              {withWetThumbprint} / {receipts.length}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${pendingThumbprint > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {pendingThumbprint > 0 ? `${pendingThumbprint} pendientes de firma/huella física` : '100% de recibos con huella física'}
            </p>
          </div>
        </div>
      </div>

      {/* Incomplete Physical Dossiers Warning (if any) */}
      {pendingThumbprint > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <h4 className="font-bold text-amber-950 text-sm">
              Atención de Auditoría Laboral (TSJ & MINPPTRASS):
            </h4>
            <p className="mt-1 leading-relaxed">
              Existen <strong>{pendingThumbprint} comprobantes</strong> que aún no cuentan con la firma manuscrita y huella dactilar húmeda registrada en su expediente físico. Según el Art. 82 de la LOPT y la doctrina del TSJ, la falta de firma física puede invertir la carga probatoria y facilitar alegatos de salario ordinario.
            </p>
            <div className="mt-2.5">
              <button
                id="btn-goto-vault-pending"
                onClick={() => onNavigateTab('vault')}
                className="font-bold underline text-amber-950 hover:text-black cursor-pointer"
              >
                Ver recibos pendientes en la Bóveda de Control →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Section: Risk Gauge + SENIAT Reconciliation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Gauge Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Índice Global de Desalarización (Ratio γ)
                </h3>
                <p className="text-xs text-slate-500">
                  Proporción de beneficios no salariales frente al paquete total
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${riskBadge.color}`}>
                {riskBadge.label}
              </span>
            </div>

            {/* Gauge visual */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500">Nivel Promedio Empresa:</span>
                <span className="font-bold text-slate-900">{avgPercentage}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all ${
                    avgGamma <= 0.40 ? 'bg-emerald-500' : avgGamma <= 0.60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, avgPercentage))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Conservador)</span>
                <span>40% (Límite Seguro)</span>
                <span>60% (Atención)</span>
                <span>100%</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border border-slate-200">
              <strong className="text-slate-800 block mb-1">Criterio Jurisprudencial (Caso INDULAC):</strong>
              Los pagos asistenciales bajo el Art. 105 LOTTT son plenamente válidos siempre que guarden relación con el costo real del sustento familiar y no encubran enriquecimiento sin causa o bonificaciones de productividad individual.
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Trabajadores activos evaluados:</span>
            <span className="font-bold text-slate-900">{employees.length} colaboradores</span>
          </div>
        </div>

        {/* SENIAT Reconciliation Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Conciliación Fiscal SENIAT (Art. 27 LISLR)
                </h3>
                <p className="text-xs text-slate-500">
                  Cotejo 1 a 1 entre Facturas de Compra de Víveres y Entregas Físicas
                </p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Reconciliation Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block uppercase font-medium">
                  Bolsas en Facturas Fiscales:
                </span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {companyInvoices.reduce((acc, i) => acc + i.totalBasketsCovered, 0)} unidades
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block uppercase font-medium">
                  Entregas con Comprobante:
                </span>
                <span className="text-lg font-bold font-mono text-emerald-700">
                  {foodBasketsCount} entregadas
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
              <strong className="block text-blue-950 font-bold mb-0.5">
                Deducibilidad del Gasto en ISLR:
              </strong>
              Los desembolsos se clasifican bajo el Numeral 22 del Art. 27 (gastos normales y necesarios) para evitar la exigencia patronal de parafiscales del Numeral 1.
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              id="btn-goto-seniat"
              onClick={() => onNavigateTab('seniat')}
              className="text-blue-600 font-bold hover:text-blue-700 inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Abrir Módulo de Conciliación Tributaria</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Últimos Comprobantes de Beneficios Emitidos
            </h3>
            <p className="text-xs text-slate-500">
              Visualice, descargue en Word o imprima comprobantes con blindaje legal
            </p>
          </div>
          <button
            id="btn-view-all-vault"
            onClick={() => onNavigateTab('vault')}
            className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Ver todos los expedientes en Bóveda →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3">Beneficio</th>
                <th className="px-4 py-3 text-right">Monto USD / Bs.</th>
                <th className="px-4 py-3 text-center">Tríada</th>
                <th className="px-4 py-3 text-center">Huella Húmeda</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyReceipts.slice(0, 5).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {r.receiptNumber}
                    <span className="block text-[10px] text-slate-400 font-normal">{r.issueDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <strong className="text-slate-900 block">{r.employeeName}</strong>
                    <span className="text-[11px] text-slate-500">{r.employeeCedula} • {r.employeeCargo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                      {r.category === 'bolsa_comida'
                        ? 'Bolsa de Comida'
                        : r.category === 'alimentacion_complementaria'
                        ? 'Alimentación Complementaria'
                        : r.category === 'gastos_medicos'
                        ? 'Gastos Médicos'
                        : 'Transporte / Otros'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <div className="font-bold text-slate-900">{formatUSD(r.amountUSD)}</div>
                    <div className="text-[11px] text-emerald-700">{formatBs(r.amountBs)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.triadStatus === 'archivado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.triadStatus === 'transferido'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.triadStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.hasWetThumbprint ? (
                      <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Registrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-500 font-semibold text-[11px]">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      id={`btn-view-rec-${r.id}`}
                      onClick={() => onSelectReceipt(r)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs cursor-pointer"
                    >
                      Ver Comprobante
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
