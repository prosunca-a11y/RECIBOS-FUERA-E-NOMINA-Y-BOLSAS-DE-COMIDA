export function formatBs(amount: number): string {
  if (isNaN(amount)) return 'Bs. 0,00';
  return 'Bs. ' + amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUSD(amount: number): string {
  if (isNaN(amount)) return '$0.00';
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function convertUSDToBs(amountUSD: number, tasaBCV: number): number {
  return Math.round(amountUSD * tasaBCV * 100) / 100;
}

export function convertBsToUSD(amountBs: number, tasaBCV: number): number {
  if (tasaBCV <= 0) return 0;
  return Math.round((amountBs / tasaBCV) * 100) / 100;
}

export interface RiskEvaluation {
  gamma: number; // 0 to 1
  percentage: number; // 0 to 100
  level: 'verde' | 'amarillo' | 'rojo';
  label: string;
  badgeClass: string;
  description: string;
}

export function calculateDesalarizationRisk(
  benefitAmountBs: number,
  salarioBaseBs: number
): RiskEvaluation {
  const total = salarioBaseBs + benefitAmountBs;
  if (total <= 0) {
    return {
      gamma: 0,
      percentage: 0,
      level: 'verde',
      label: 'Riesgo Mínimo (0%)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'El beneficio no genera exposición salarial detectada.',
    };
  }

  const gamma = benefitAmountBs / total;
  const percentage = Math.round(gamma * 100);

  if (gamma <= 0.40) {
    return {
      gamma,
      percentage,
      level: 'verde',
      label: `Riesgo Bajo (${percentage}%)`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description:
        'Los beneficios sociales se encuentran en rango conservador (≤ 40% del paquete global). Amparado sólidamente en doctrina TSJ.',
    };
  } else if (gamma <= 0.60) {
    return {
      gamma,
      percentage,
      level: 'amarillo',
      label: `Riesgo Moderado (${percentage}%)`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      description:
        'Los beneficios representan entre el 40% y 60% del ingreso global. Se recomienda justificar expresamente la protección familiar (Sentencia 523 TSJ).',
    };
  } else {
    return {
      gamma,
      percentage,
      level: 'rojo',
      label: `Riesgo Crítico (${percentage}%)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      description:
        'Más del 60% del paquete es no remunerativo. Alerta de presunción de desalarización en caso de fiscalización del MINPPTRASS. Requiere descargo extraordinario.',
    };
  }
}
