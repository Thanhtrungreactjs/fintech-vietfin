export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#101613] p-5 shadow-sm ${className}`}>{children}</div>
  );
}

export function SectionTitle({ icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <span className="text-emerald-400">{icon}</span>}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const badgeStyles = {
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30",
  gray: "bg-white/10 text-gray-300 border-white/15",
  blue: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export function Badge({ children, tone = "gray" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyles[tone]}`}>
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-500 text-black hover:bg-emerald-400",
    secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    danger: "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25",
    ghost: "text-gray-300 hover:bg-white/5",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm text-gray-400">{label}</span>}
      <input
        className={`w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 ${className}`}
        {...props}
      />
    </label>
  );
}

// Displays the numeric value grouped with commas (e.g. 50,000,000) while
// typing, but reports the raw digit string to onChange so callers keep
// working with a plain number.
export function AmountInput({ label, value, onChange, className = "", ...props }) {
  const display = value === "" || value === undefined || value === null ? "" : Number(value).toLocaleString("en-US");
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm text-gray-400">{label}</span>}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className={`w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm text-gray-400">{label}</span>}
      <select
        className={`w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500/60 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function StatCard({ label, value, sub, icon, tone = "green" }) {
  const toneText = { green: "text-emerald-400", red: "text-red-400", blue: "text-sky-400", gray: "text-gray-300" };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-white">{value}</p>
          {sub && <p className={`mt-1 text-xs ${toneText[tone]}`}>{sub}</p>}
        </div>
        {icon && <div className={`rounded-xl bg-white/5 p-2.5 ${toneText[tone]}`}>{icon}</div>}
      </div>
    </Card>
  );
}

export function EmptyState({ message }) {
  return <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-gray-500">{message}</div>;
}

const MODAL_SIZES = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0e1310] p-6 shadow-xl ${MODAL_SIZES[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alert({ children, tone = "red" }) {
  const styles = {
    red: "border-red-500/30 bg-red-500/10 text-red-400",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  return <div className={`rounded-xl border px-3.5 py-2.5 text-sm ${styles[tone]}`}>{children}</div>;
}
