import { formatCurrency } from "@/lib/utils";

/**
 * Divides a whole-lira balance across installments without losing or adding money.
 * Any rounding remainder is applied to the final installment.
 */
export function buildInstallmentSchedule(balance: number, installmentCount: number): number[] {
  const total = Math.max(0, Math.round(balance));
  const count = Math.max(1, Math.floor(installmentCount));
  const regular = Math.floor(total / count);
  const final = total - regular * (count - 1);

  return Array.from({ length: count }, (_, index) => index === count - 1 ? final : regular);
}

export function formatInstallmentSchedule(amounts: number[]): string {
  if (amounts.length === 0) return "—";

  const groups: Array<{ amount: number; count: number }> = [];
  for (const amount of amounts) {
    const last = groups.at(-1);
    if (last && last.amount === amount) last.count += 1;
    else groups.push({ amount, count: 1 });
  }

  return groups
    .map(({ amount, count }) => `${count} × ${formatCurrency(amount)}`)
    .join(" + ");
}
