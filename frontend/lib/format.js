export function compactNumber(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value ?? 0));
}

export function percent(value) {
  return `${Number(value ?? 0)}%`;
}

export function titleize(value) {
  return String(value ?? "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function programName(programs, id) {
  return programs.find((program) => program.id === id)?.name ?? titleize(id);
}

export function severityRank(value) {
  return { high: 0, medium: 1, low: 2 }[value] ?? 3;
}

export function formatDate(value) {
  const parsed = parseDate(value);
  return parsed
    ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : String(value ?? "—");
}

export function formatDateTime(value) {
  const parsed = parseDate(value);
  return parsed
    ? parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : String(value ?? "—");
}

export function isOverdue(value) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const due = new Date(parsed);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}
