import type { Task } from "../types";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const shortDateYear = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const shortTime = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const shortWeekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const longDateTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export interface DeadlineMeta {
  tone: "overdue" | "today" | "upcoming" | "later" | "complete";
  label: string;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatDate(date: Date) {
  return (date.getFullYear() === new Date().getFullYear()
    ? shortDate
    : shortDateYear
  ).format(date);
}

function formatDateTime(date: Date) {
  return `${formatDate(date)} at ${shortTime.format(date)}`;
}

export function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / MINUTE));

  if (totalMinutes < 60) return `${totalMinutes} min`;

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    return minutes ? `${totalHours} hr ${minutes} min` : `${totalHours} hr`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours
    ? `${days} day${days === 1 ? "" : "s"} ${hours} hr`
    : `${days} day${days === 1 ? "" : "s"}`;
}

export function getDeadlineMeta(
  task: Pick<Task, "deadline" | "completed">,
): DeadlineMeta | null {
  if (!task.deadline) return null;
  const due = toDate(task.deadline);
  if (!due) return null;

  const now = new Date();

  if (task.completed) {
    return {
      tone: "complete",
      label: `Was due ${formatDateTime(due)}`,
    };
  }

  if (due.getTime() <= now.getTime()) {
    return {
      tone: "overdue",
      label: `Overdue by ${formatDuration(now.getTime() - due.getTime())}`,
    };
  }

  if (isSameDay(due, now)) {
    return {
      tone: "today",
      label: `Due today at ${shortTime.format(due)}`,
    };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(due, tomorrow)) {
    return {
      tone: "today",
      label: `Due tomorrow at ${shortTime.format(due)}`,
    };
  }

  const daysAway = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY,
  );

  if (daysAway <= 7) {
    return {
      tone: "upcoming",
      label: `Due ${shortWeekday.format(due)} at ${shortTime.format(due)}`,
    };
  }

  return {
    tone: "later",
    label: `Due ${formatDateTime(due)}`,
  };
}

export function formatHistoryTime(isoDate: string) {
  const date = toDate(isoDate);
  if (!date) return "";

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, now)) return `Today, ${shortTime.format(date)}`;
  if (isSameDay(date, yesterday)) return `Yesterday, ${shortTime.format(date)}`;
  return `${formatDate(date)}, ${shortTime.format(date)}`;
}

export function formatFullDate(isoDate: string) {
  const date = toDate(isoDate);
  return date ? longDateTime.format(date) : "";
}

export function formatToday(date: Date) {
  return longDate.format(date);
}

export function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export function toIsoFromLocalInput(value: string) {
  if (!value) return null;
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export function toLocalInputValue(isoDate: string | null) {
  const date = toDate(isoDate);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE);
  return local.toISOString().slice(0, 16);
}

export function toDateInputValue(isoDate: string | null) {
  const date = toDate(isoDate);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE);
  return local.toISOString().slice(0, 10);
}

export function toTimeInputValue(isoDate: string | null) {
  const date = toDate(isoDate);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE);
  return local.toISOString().slice(11, 16);
}

export function toIsoFromDateTimeInput(dateValue: string, timeValue: string) {
  if (!dateValue) return null;
  const date = toDate(`${dateValue}T${timeValue || "00:00"}`);
  return date ? date.toISOString() : null;
}

export function dateInputForOffset(days: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MINUTE);
  return local.toISOString().slice(0, 10);
}

export function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function truncate(text: string, maxLength: number) {
  return text.length > maxLength
    ? `${text.slice(0, maxLength - 1).trimEnd()}…`
    : text;
}
