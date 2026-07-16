import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import logoUrl from "../assets/solace-logo.svg";

export type Accent = "green" | "cyan" | "amber" | "red" | "violet" | "blue" | "slate";

/* ---------- Broker hub ---------- */

export function Broker({
  label = "Solace Broker",
  pill = true,
  small = false,
  active = false,
  className = "",
}: {
  label?: string;
  pill?: boolean;
  small?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`broker ${pill ? "pill" : ""} ${small ? "small" : ""} ${
        active ? "active" : ""
      } ${className}`}
    >
      <img className="broker-logo" src={logoUrl} alt="Solace" />
      {label ? <span className="broker-label">{label}</span> : null}
    </div>
  );
}

/* ---------- Node card ---------- */

export function Node({
  icon,
  name,
  role,
  accent = "green",
  value,
  sub,
  badge,
  lit = false,
  offline = false,
  children,
  style,
}: {
  icon?: ReactNode;
  name: string;
  role?: string;
  accent?: Accent;
  value?: ReactNode;
  sub?: ReactNode;
  badge?: { text: string; kind: "ok" | "off" | "warn" | "err" };
  lit?: boolean;
  offline?: boolean;
  children?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`node accent-${accent} ${lit ? "lit" : ""} ${offline ? "offline" : ""}`}
      style={style}
    >
      <div className="node-top">
        {icon ? <div className="node-icon">{icon}</div> : null}
        <div className="node-titles">
          <div className="node-name">{name}</div>
          {role ? <div className="node-role">{role}</div> : null}
        </div>
      </div>
      {value !== undefined ? <div className="node-value">{value}</div> : null}
      {sub !== undefined ? <div className="node-sub">{sub}</div> : null}
      {badge ? <span className={`node-badge badge-${badge.kind}`}>{badge.text}</span> : null}
      {children}
    </div>
  );
}

/* ---------- Message token ---------- */

export function MsgToken({
  label,
  tone = "green",
  dim = false,
}: {
  label: ReactNode;
  tone?: "green" | "amber" | "red" | "violet";
  dim?: boolean;
}) {
  return (
    <span className={`msg-token ${tone} ${dim ? "dim" : ""}`}>
      <span className="msg-dot" />
      {label}
    </span>
  );
}

/* ---------- Controls ---------- */

export function Btn({
  children,
  onClick,
  disabled,
  variant = "default",
  sm = false,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "ghost";
  sm?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      className={`btn ${variant === "default" ? "" : variant} ${sm ? "sm" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track">
        <span className="knob" />
      </span>
      {label}
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-field">
      <label>
        {label}
        <b>
          {value}
          {unit}
        </b>
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Cards ---------- */

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {title ? (
        <div className="card-head">
          {icon}
          <h3>{title}</h3>
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function ControlBar({ children }: { children: ReactNode }) {
  return (
    <div className="controls">
      <div className="controls-title">Controls</div>
      {children}
    </div>
  );
}

export function ControlGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="control-group">
      {label ? <div className="control-group-label">{label}</div> : null}
      {children}
    </div>
  );
}

export function InsightCard({ items }: { items: ReactNode[] }) {
  return (
    <Card title="What you learn">
      <ul className="insight-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </Card>
  );
}

export function TagCard({ title, tags }: { title: string; tags: string[] }) {
  return (
    <Card title={title}>
      <div className="tag-row">
        {tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Prediction prompt ---------- */

export function Prediction({
  question,
  choices,
  reveal,
}: {
  question: string;
  choices: { id: string; text: string; correct?: boolean }[];
  reveal: ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  return (
    <div className="card predict">
      <div className="card-head">
        <h3>Predict First</h3>
      </div>
      <div className="card-body">
        <div className="predict-q">{question}</div>
        <div className="predict-choices">
          {choices.map((c) => {
            let cls = "predict-choice";
            if (answered) {
              if (c.correct) cls += " correct";
              else if (picked === c.id) cls += " wrong";
            } else if (picked === c.id) {
              cls += " picked";
            }
            return (
              <button key={c.id} className={cls} onClick={() => setPicked(c.id)}>
                {c.text}
              </button>
            );
          })}
        </div>
        {answered ? <div className="predict-reveal">{reveal}</div> : null}
      </div>
    </div>
  );
}

/* ---------- Stage frame ---------- */

export function Stage({
  children,
  note,
  minHeight,
}: {
  children: ReactNode;
  note?: ReactNode;
  minHeight?: number;
}) {
  return (
    <div className="stage-card">
      <div className="stage" style={minHeight ? { minHeight } : undefined}>
        {children}
      </div>
      {note !== undefined ? (
        <div className="stage-note">
          <span className="dot" />
          {note}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Traveling particle ---------- */
/* Animates a token from `from` to `to` (percent coords within stage). */
export function Particle({
  from,
  to,
  duration = 0.9,
  onDone,
  children,
  zIndex = 1,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  duration?: number;
  onDone?: () => void;
  children: ReactNode;
  zIndex?: number;
}) {
  return (
    <motion.div
      className="particle"
      style={{ zIndex }}
      initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0.6, x: "-50%", y: "-50%" }}
      animate={{ left: `${to.x}%`, top: `${to.y}%`, opacity: [0, 1, 1, 1], scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration, ease: "easeInOut" }}
      onAnimationComplete={onDone}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Compact mini-queue (depth graphic) ---------- */

export function MiniQueue({
  depth,
  cap = 5,
  tone = "green",
}: {
  depth: number;
  cap?: number;
  tone?: "green" | "blue" | "red" | "amber" | "violet";
}) {
  const shown = Math.min(depth, cap);
  const color = `var(--${tone === "green" ? "green" : tone})`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 14,
              borderRadius: 2,
              border: "1px solid var(--line)",
              background: i < shown ? color : "rgba(255,255,255,0.04)",
              boxShadow: i < shown ? `0 0 6px ${color}` : "none",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          fontFamily: "SF Mono, ui-monospace, monospace",
          color: depth > 0 ? color : "var(--text-mute)",
        }}
      >
        {depth}
      </span>
    </div>
  );
}

/* ---------- Durable-queue chip (drawn outside a consumer) ---------- */

export function QueueChip({
  depth,
  label = "queue",
  cap = 6,
  tone = "green",
}: {
  depth: number;
  label?: string;
  cap?: number;
  tone?: "green" | "blue" | "red" | "amber" | "violet";
}) {
  const shown = Math.min(depth, cap);
  const color = `var(--${tone === "green" ? "green" : tone})`;
  return (
    <div className="qchip">
      {label ? <span className="qchip-label">{label}</span> : null}
      <div className="qcells">
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            className="qcell"
            style={i < shown ? { background: color, boxShadow: `0 0 6px ${color}` } : undefined}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "SF Mono, ui-monospace, monospace", color: depth > 0 ? color : "var(--text-mute)" }}>
        {depth}
      </span>
    </div>
  );
}

/* ---------- Positioned helpers ---------- */

export function Anchored({
  pt,
  children,
  zIndex = 2,
}: {
  pt: { x: number; y: number };
  children: ReactNode;
  zIndex?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${pt.x}%`,
        top: `${pt.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex,
      }}
    >
      {children}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "cyan" | "red" | "amber" | "violet" | "slate";
}) {
  const color = `var(--${tone === "green" ? "green-bright" : tone})`;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "6px 12px",
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--panel-2)",
        minWidth: 92,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
        }}
      >
        {label}
      </span>
      <strong
        style={{ fontSize: 18, color, fontFamily: "SF Mono, ui-monospace, monospace" }}
      >
        {value}
      </strong>
    </div>
  );
}

/* small inline icons (emoji-free glyphs via unicode) */
export const Icons = {
  plc: "▤",
  sensor: "◈",
  dashboard: "▦",
  machine: "⚙",
  mes: "▣",
  db: "▤",
  worker: "◉",
  cloud: "☁",
  plant: "▩",
  ai: "✦",
  analytics: "▤",
  historian: "▥",
  rest: "⇄",
  qms: "✓",
  maint: "✦",
  ops: "◎",
};
