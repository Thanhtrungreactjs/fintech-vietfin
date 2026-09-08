import { useEffect, useState } from "react";
import api from "../api/client";
import { formatVND, formatUsdt, formatDateTime } from "../lib/format";
import { Card, SectionTitle, Button, Input, Badge, EmptyState, Alert } from "../components/ui";
import TradingViewChart from "../components/TradingViewChart";
import { TrendingUp, TrendingDown, LineChart } from "lucide-react";

const QUICK_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];

export default function Trading() {
  const [symbolInput, setSymbolInput] = useState("BTCUSDT");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [price, setPrice] = useState(null);
  const [priceError, setPriceError] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPrice = async (sym) => {
    try {
      const { data } = await api.get(`/trading/price/${sym}`);
      setPrice(data.price);
      setPriceError("");
    } catch (err) {
      setPrice(null);
      setPriceError(err.message);
    }
  };

  const loadPositions = async () => {
    const { data } = await api.get("/trading/positions");
    setPositions(data.positions);
  };

  const loadOrders = async () => {
    const { data } = await api.get("/trading/orders");
    setOrders(data.orders);
  };

  useEffect(() => {
    loadPositions();
    loadOrders();
  }, []);

  useEffect(() => {
    loadPrice(symbol);
    const interval = setInterval(() => loadPrice(symbol), 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  const applySymbol = (e) => {
    e?.preventDefault();
    const next = symbolInput.trim().toUpperCase();
    if (!next) return;
    setSymbolInput(next);
    setSymbol(next);
  };

  const currentPosition = positions.find((p) => p.symbol === symbol);
  const estimatedAmount = price && quantity ? Number(quantity) * price : 0;

  const placeOrder = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await api.post("/trading/orders", { symbol, side, quantity: Number(quantity) });
      setNotice(
        `${side === "BUY" ? "Đã mua" : "Đã bán"} ${quantity} ${symbol} @ ${formatUsdt(data.price)}${
          data.order.realizedPnl != null ? ` — ${data.order.realizedPnl >= 0 ? "Lãi" : "Lỗ"} ${formatVND(Math.abs(data.order.realizedPnl))}` : ""
        }`
      );
      setQuantity("");
      await Promise.all([loadPositions(), loadOrders()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Trading Playground</h1>
        <p className="text-sm text-gray-400">Biểu đồ giá thời gian thực từ TradingView, mua/bán mô phỏng bằng số dư ví.</p>
      </div>

      <Alert tone="green">
        Đây là môi trường <strong>mô phỏng (paper trading)</strong> cho vui/luyện tập — không có tài sản thật được
        nắm giữ và không có lệnh nào gửi ra sàn thật. Giá tham chiếu real-time từ Binance public API (đơn vị USDT).
        Để tiện chơi thử, hệ thống quy ước <strong>1 USDT tham chiếu = 1 VND</strong> khi trừ/cộng vào ví — số tiền
        thanh toán hiển thị bằng VND chỉ là quy đổi mô phỏng, không phải tỷ giá thật.
      </Alert>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <form onSubmit={applySymbol} className="mb-4 flex flex-wrap items-center gap-2">
              <Input
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="VD: BTCUSDT"
                className="w-40"
              />
              <Button type="submit" variant="secondary">
                <LineChart size={16} /> Xem biểu đồ
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSymbolInput(s);
                      setSymbol(s);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      symbol === s
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </form>
            <TradingViewChart symbol={symbol} height={720} />
          </Card>

          <Card>
            <SectionTitle title="Vị thế đang nắm giữ" />
            {positions.length === 0 ? (
              <EmptyState message="Bạn chưa có vị thế nào." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-500">
                      <th className="py-2 pr-4 font-normal">Mã</th>
                      <th className="py-2 pr-4 font-normal">Số lượng</th>
                      <th className="py-2 pr-4 font-normal">Giá vốn TB</th>
                      <th className="py-2 pr-4 font-normal">Giá hiện tại</th>
                      <th className="py-2 pr-4 font-normal">Lãi/lỗ tạm tính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {positions.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 text-white">{p.symbol}</td>
                        <td className="py-3 pr-4 text-gray-400">{p.quantity}</td>
                        <td className="py-3 pr-4 text-gray-400">{formatUsdt(p.avgEntryPrice)}</td>
                        <td className="py-3 pr-4 text-gray-400">{p.currentPrice ? formatUsdt(p.currentPrice) : "-"}</td>
                        <td className={`py-3 pr-4 font-medium ${p.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.unrealizedPnl != null ? `${p.unrealizedPnl >= 0 ? "+" : ""}${formatVND(p.unrealizedPnl)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle title="Lịch sử lệnh" />
            {orders.length === 0 ? (
              <EmptyState message="Chưa có lệnh nào." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-500">
                      <th className="py-2 pr-4 font-normal">Mã</th>
                      <th className="py-2 pr-4 font-normal">Lệnh</th>
                      <th className="py-2 pr-4 font-normal">Số lượng</th>
                      <th className="py-2 pr-4 font-normal">Giá khớp</th>
                      <th className="py-2 pr-4 font-normal">Lãi/lỗ</th>
                      <th className="py-2 pr-4 font-normal">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 pr-4 text-white">{o.symbol}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={o.side === "BUY" ? "green" : "red"}>{o.side === "BUY" ? "MUA" : "BÁN"}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{o.quantity}</td>
                        <td className="py-3 pr-4 text-gray-400">{formatUsdt(o.price)}</td>
                        <td className="py-3 pr-4 text-gray-400">
                          {o.realizedPnl != null ? (
                            <span className={o.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                              {o.realizedPnl >= 0 ? "+" : ""}
                              {formatVND(o.realizedPnl)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{formatDateTime(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <SectionTitle title={`Đặt lệnh — ${symbol}`} />
          <div className="mb-4 flex items-center gap-2">
            {price ? (
              <p className="text-2xl font-semibold text-white">{formatUsdt(price)}</p>
            ) : (
              <p className="text-sm text-red-400">{priceError || "Đang tải giá..."}</p>
            )}
          </div>

          <div className="mb-4 flex rounded-xl border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${side === "BUY" ? "bg-emerald-500 text-black" : "text-gray-400"}`}
            >
              <TrendingUp size={14} className="mr-1 inline" /> Mua
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${side === "SELL" ? "bg-red-500 text-white" : "text-gray-400"}`}
            >
              <TrendingDown size={14} className="mr-1 inline" /> Bán
            </button>
          </div>

          <form onSubmit={placeOrder} className="space-y-3">
            <Input
              label={`Số lượng ${symbol.replace("USDT", "")}`}
              type="number"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {side === "SELL" && currentPosition && (
              <p className="text-xs text-gray-500">Đang nắm giữ: {currentPosition.quantity}</p>
            )}
            <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Giá trị {side === "BUY" ? "cần thanh toán" : "nhận về"}</span>
                <span className="text-white">{formatVND(estimatedAmount)}</span>
              </div>
            </div>
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="green">{notice}</Alert>}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !price || !quantity}
              variant={side === "SELL" ? "danger" : "primary"}
            >
              {busy ? "Đang xử lý..." : side === "BUY" ? "Đặt lệnh mua" : "Đặt lệnh bán"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
