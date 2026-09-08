// Live reference prices for the simulated trading module, sourced from
// Binance's public (keyless) market data API — no real order is ever placed
// there, it is used purely as a real-time price feed to mark simulated fills.
const SYMBOL_PATTERN = /^[A-Z0-9]{5,20}$/;

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

async function getPrice(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new Error("Mã giao dịch không hợp lệ");
  }

  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalized}`);
  if (!res.ok) {
    throw new Error("Không tìm thấy mã giao dịch trên Binance");
  }
  const data = await res.json();
  return { symbol: normalized, price: Number(data.price) };
}

module.exports = { getPrice, normalizeSymbol, SYMBOL_PATTERN };
