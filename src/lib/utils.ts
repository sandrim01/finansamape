import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | any | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

/**
 * Cálculo correto da quilometragem da Samape:
 * km_ida = Hodômetro de saída do veículo
 * km_volta = Hodômetro de retorno do veículo
 * km_rodados = km_volta - km_ida (distância real percorrida na OS)
 * valor_deslocamento = km_rodados * valor_por_km
 */
export function calcularQuilometragem(
  kmIda?: any,
  kmVolta?: any,
  valorPorKm?: any
) {
  let ida = Number(kmIda || 0);
  const volta = Number(kmVolta || 0);
  const taxa = Number(valorPorKm || 0);

  // Sanitização de digitação de hodômetro (ex: 146.68 digitado com ponto em vez de 146680)
  if (ida > 0 && ida < 1000 && volta > 10000) {
    if (Math.abs(ida * 1000 - volta) < 2500) {
      ida = ida * 1000;
    }
  }

  let kmRodados = 0;
  if (volta > 0 && ida > 0 && volta >= ida) {
    kmRodados = volta - ida;
  } else if (volta > 0 && ida === 0) {
    kmRodados = volta;
  }

  // Trava de segurança para distâncias irreais de atendimento (ex: erro grosseiro de digitação)
  if (kmRodados > 3000 && taxa === 0) {
    kmRodados = 0;
  }

  const valorDeslocamento = kmRodados * taxa;

  return {
    kmIda: ida,
    kmVolta: volta,
    kmRodados: Number(kmRodados.toFixed(2)),
    valorPorKm: taxa,
    valorDeslocamento: Number(valorDeslocamento.toFixed(2)),
  };
}
