export type Currency = "EUR" | "USD";

export function formatCurrency(
  value: number,
  currency: Currency,
  minimumFractionDigits: number,
  maximumFractionDigits: number = minimumFractionDigits,
): string {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function currencySymbol(currency: Currency): string {
  return currency === "USD" ? "$" : "€";
}
