import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { titleize } from "../lib/format";

export function PageHeader({ title, children, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </header>
  );
}

export function Notice({ children, tone = "error" }) {
  if (!children) return null;
  return <div className={`notice ${tone}`}>{children}</div>;
}

export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonTable({ rows = 4, cols = 4 }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i}><Skeleton style={{ width: '60%', height: 12 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><Skeleton style={{ width: `${60 + (c * 10) % 40}%`, height: 14 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <section className="stat-strip">
      {Array.from({ length: count }, (_, i) => (
        <div className="stat" key={i}>
          <Skeleton style={{ width: 80, height: 12 }} />
          <Skeleton style={{ width: 48, height: 24 }} />
          <Skeleton style={{ width: 100, height: 12 }} />
        </div>
      ))}
    </section>
  );
}

export function LoadingState() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SkeletonStats />
      <SkeletonTable />
    </div>
  );
}

export function EmptyState({ children, title, action }) {
  return (
    <div className="empty">
      {title ? <strong>{title}</strong> : null}
      <p>{children}</p>
      {action || null}
    </div>
  );
}

export function AnimateIn({ children, delay = 0, className = "" }) {
  return (
    <div className={`animate-in ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

export function StatStrip({ children }) {
  return <section className="stat-strip">{children}</section>;
}

export function Stat({ label, value, help }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {help ? <em>{help}</em> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className = "", note }) {
  return (
    <section className={`panel animate-in ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {children}
      {note ? <div className="panel-note">{note}</div> : null}
    </section>
  );
}

export function Table({ children }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  );
}

export function Status({ value }) {
  const label = titleize(value ?? "none");
  return (
    <span className={`status status-${String(value ?? "none")}`} aria-label={`Status: ${label}`} title={`Status: ${label}`}>
      {label}
    </span>
  );
}

export function Progress({ value }) {
  const width = Math.max(3, Math.min(100, Number(value ?? 0)));
  return (
    <div className="progress">
      <div style={{ width: `${width}%` }} />
    </div>
  );
}

export function DetailList({ items }) {
  return (
    <div className="detail-list">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function TextLink({ href, children }) {
  return (
    <Link className="text-link" href={href}>
      {children}
    </Link>
  );
}

export function ButtonLink({ href, children, className = "" }) {
  return (
    <Link className={`button-link ${className}`.trim()} href={href}>
      {children}
    </Link>
  );
}

export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useToast(duration = 4000) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((type, message) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type, message });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, [duration]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, showToast };
}

export function ToastContainer({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast toast-${toast.type}`}>{toast.message}</div>
    </div>
  );
}

export function FieldMessage({ tone = "error", children }) {
  if (!children) return null;
  return <span className={`field-message field-message-${tone}`}>{children}</span>;
}
