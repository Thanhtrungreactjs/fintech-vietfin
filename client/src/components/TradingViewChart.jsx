import { useEffect, useRef } from "react";

// Embeds TradingView's free "Advanced Chart" widget. Re-injects the widget
// script whenever `symbol` changes since the widget renders itself once from
// the JSON config and does not expose a JS API to update it afterwards.
export default function TradingViewChart({ symbol, height = 480 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = `<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>`;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: "15",
      timezone: "Asia/Ho_Chi_Minh",
      theme: "dark",
      style: "1",
      locale: "vi_VN",
      allow_symbol_change: false,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container overflow-hidden rounded-xl" style={{ height }} ref={containerRef} />
  );
}
