export function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    amount || 0
  );
}

// Market reference price (e.g. from Binance) — never rendered as VND since
// it isn't one; only the resulting wallet debit/credit amount is VND.
export function formatUsdt(amount) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount || 0)} USDT`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
