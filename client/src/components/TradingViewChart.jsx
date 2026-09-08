import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

// Embeds TradingView's free "Advanced Chart" widget. Re-injects the widget
// script whenever `symbol` changes since the widget renders itself once from
// the JSON config and does not expose a JS API to update it afterwards.
//
// IMPORTANT: TradingView's own script forcibly sets the
// ".tradingview-widget-container" element's inline height/width to 100% (it
// expects to fill a host-sized wrapper, not to be sized itself). So the
// resizable/fullscreen sizing must live on an OUTER wrapper div, with the
// TradingView-managed div nested inside tracking it via height:100% —
// otherwise every explicit height set directly on that div gets clobbered.
export default function TradingViewChart({ symbol, height = 800 }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

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

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  };

  return (
    <div ref={wrapperRef} className={fullscreen ? "bg-[#0b0f0d] p-2" : "relative"}>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs text-gray-300 backdrop-blur hover:text-white"
        title={fullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {fullscreen ? "Thoát" : "Toàn màn hình"}
      </button>
      {/* Sizing/resizing lives here — never on the .tradingview-widget-container itself. */}
      <div
        className="resize-y overflow-auto rounded-xl border border-white/10"
        style={{ height: fullscreen ? "calc(100vh - 16px)" : height, minHeight: 400 }}
      >
        <div className="tradingview-widget-container h-full w-full" ref={containerRef} />
      </div>
    </div>
  );
}
