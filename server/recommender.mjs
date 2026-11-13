/**
 * Task completion-time recommender.
 *
 * A JavaScript port of `todo_recommender/task_recommender.py`, kept
 * dependency-free so it can run inside the Taskflow API. It learns per-task
 * duration patterns from historical records and reports whether a proposed
 * deadline is realistic, suggesting typical/safe durations and dates when it
 * is not.
 *
 * Expected rows: { task_id, task, added_date, deadline_date, completed_date }
 * Dates may be `YYYY-MM-DD`, ISO timestamps, or `DD-MM-YYYY`.
 */
import { readFileSync } from "node:fs";

const DAY_MS = 24 * 60 * 60 * 1000;

const RISK_LABELS = {
  likely_feasible: "likely feasible",
  tight: "tight",
  unlikely: "unlikely",
  unknown: "unknown",
};

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Convert a date-ish value into an integer day number (UTC midnight), or null.
 * Accepts Date objects, ISO timestamps, `YYYY-MM-DD`, and `DD-MM-YYYY`.
 */
export function parseDay(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return Math.floor(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) /
        DAY_MS,
    );
  }

  const text = String(value).trim();
  if (!text) return null;

  let year;
  let month;
  let day;
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
    if (!match) return null;
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  }

  const stamp = Date.UTC(year, month - 1, day);
  const check = new Date(stamp);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.round(stamp / DAY_MS);
}

function formatDay(day, style = "dmy") {
  if (day === null || day === undefined) return null;
  const date = new Date(day * DAY_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getUTCDate()).padStart(2, "0");
  return style === "iso"
    ? `${year}-${month}-${dayOfMonth}`
    : `${dayOfMonth}-${month}-${year}`;
}

function percentile(sortedValues, q) {
  if (!sortedValues.length) return null;
  if (q <= 0) return sortedValues[0];
  if (q >= 1) return sortedValues[sortedValues.length - 1];

  const position = (sortedValues.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sortedValues[low];

  const fraction = position - low;
  return sortedValues[low] * (1 - fraction) + sortedValues[high] * fraction;
}

function round(value, places = 2) {
  if (value === null || value === undefined) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Minimal RFC-4180-ish CSV parser; handles quotes, commas and newlines. */
export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      field = "";
      records.push(record);
      record = [];
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || record.length) {
    record.push(field);
    records.push(record);
  }

  const rows = records.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (!rows.length) return [];

  const header = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((row) => {
    const item = {};
    header.forEach((name, index) => {
      item[name] = (row[index] ?? "").trim();
    });
    return item;
  });
}

/** Read a CSV file of historical tasks into recommender rows. */
export function loadCsvRows(path) {
  const text = readFileSync(path, "utf8");
  return parseCsv(text).map((row) => ({
    task_id: row.task_id ?? row.id ?? "",
    task: row.task ?? "",
    added_date: row.added_date ?? "",
    deadline_date: row.deadline_date ?? "",
    completed_date: row.completed_date ?? "",
  }));
}

function buildStats(taskId, taskName, items) {
  const actuals = [];
  const planned = [];
  let onTime = 0;
  let late = 0;
  let incomplete = 0;

  for (const item of items) {
    const added = parseDay(item.added_date);
    const deadline = parseDay(item.deadline_date);
    const completed = parseDay(item.completed_date);

    if (added !== null && deadline !== null) {
      planned.push(deadline - added);
    }

    if (completed !== null && added !== null) {
      const actual = completed - added;
      actuals.push(actual);
      if (deadline !== null && completed <= deadline) onTime += 1;
      else if (deadline !== null && completed > deadline) late += 1;
    } else {
      incomplete += 1;
    }
  }

  const sorted = [...actuals].sort((a, b) => a - b);
  const mean = (values) =>
    values.length
      ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;

  const stats = {
    task_id: taskId,
    task: taskName,
    count: items.length,
    on_time: onTime,
    late,
    incomplete,
    avg_planned: mean(planned) ?? 0,
    avg_actual: mean(actuals),
    median_actual: round(median),
    p50: round(percentile(sorted, 0.5)),
    p75: round(percentile(sorted, 0.75)),
    p80: round(percentile(sorted, 0.8)),
    p90: round(percentile(sorted, 0.9)),
    min_actual: sorted.length ? sorted[0] : null,
    max_actual: sorted.length ? sorted[sorted.length - 1] : null,
    on_time_rate: items.length ? round(onTime / items.length, 4) : 0,
  };

  return { stats, actuals };
}

export class TaskRecommender {
  constructor() {
    this.statsById = new Map();
    this.statsByName = new Map();
    this.actuals = new WeakMap();
    this.globalActuals = [];
  }

  static fromRows(rows) {
    return new TaskRecommender().fit(rows);
  }

  static fromCsv(path) {
    return TaskRecommender.fromRows(loadCsvRows(path));
  }

  // Snake_case alias for parity with the original Python API.
  static from_csv(path) {
    return TaskRecommender.fromCsv(path);
  }

  fit(rows) {
    this.statsById.clear();
    this.statsByName.clear();
    this.actuals = new WeakMap();
    this.globalActuals = [];

    const groups = new Map();
    const nameToGroup = new Map();
    for (const row of rows) {
      const taskId = String(row.task_id ?? "").trim();
      const taskName = String(row.task ?? "").trim();
      if (!taskId && !taskName) continue;

      const nameKey = normalize(taskName);
      let group = taskId
        ? groups.get(`id:${taskId}`)
        : nameKey
          ? nameToGroup.get(nameKey) ?? groups.get(`name:${nameKey}`)
          : null;

      if (!group) {
        group = { taskId, taskName, items: [] };
        groups.set(taskId ? `id:${taskId}` : `name:${nameKey}`, group);
      }

      if (!group.taskName && taskName) group.taskName = taskName;
      group.items.push(row);
      if (nameKey) nameToGroup.set(nameKey, group);
    }

    for (const group of groups.values()) {
      const { stats, actuals } = buildStats(
        group.taskId,
        group.taskName || group.taskId,
        group.items,
      );
      this.actuals.set(stats, actuals);
      this.globalActuals.push(...actuals);

      if (stats.task_id) this.statsById.set(stats.task_id, stats);

      const nameKey = normalize(stats.task);
      if (nameKey) {
        const existing = this.statsByName.get(nameKey);
        // Prefer the sample with more history when two sources share a name.
        if (!existing || stats.count >= existing.count) {
          this.statsByName.set(nameKey, stats);
        }
      }
    }

    this.globalActuals.sort((a, b) => a - b);
    return this;
  }

  findStats(taskId, taskName) {
    if (taskId) {
      const stats = this.statsById.get(String(taskId).trim());
      if (stats) return { stats, matchedBy: "task_id" };
    }

    if (taskName) {
      const name = normalize(taskName);
      if (name) {
        const exact = this.statsByName.get(name);
        if (exact) return { stats: exact, matchedBy: "exact_name" };

        if (name.length >= 3) {
          for (const [key, stats] of this.statsByName) {
            if (key.length >= 3 && (key.includes(name) || name.includes(key))) {
              return { stats, matchedBy: "normalized_name" };
            }
          }
        }
      }
    }

    return { stats: null, matchedBy: "unknown" };
  }

  /**
   * @param {object} options
   * @param {number|null} [options.plannedDays]
   * @param {string|null} [options.taskId]
   * @param {string|null} [options.taskName]
   * @param {string|Date|null} [options.addedDate]
   * @param {string|Date|null} [options.deadlineDate]
   * @param {"dmy"|"iso"} [options.outputDateFormat]
   */
  recommend(options = {}) {
    const outputDateFormat = options.outputDateFormat ?? "dmy";
    const taskId = options.taskId ?? options.task_id ?? null;
    const taskName = options.taskName ?? options.task_name ?? null;
    const plannedInput = options.plannedDays ?? options.planned_days;
    const addedInput = options.addedDate ?? options.added_date;
    const deadlineInput = options.deadlineDate ?? options.deadline_date;
    const { stats, matchedBy } = this.findStats(taskId, taskName);

    const addedDay = parseDay(addedInput);
    const deadlineDay = parseDay(deadlineInput);

    let plannedDays =
      Number.isInteger(plannedInput) && plannedInput >= 0
        ? plannedInput
        : null;
    if (plannedDays === null && addedDay !== null && deadlineDay !== null) {
      plannedDays = deadlineDay - addedDay;
    }

    if (!stats) {
      return {
        task_id: taskId,
        task: taskName ?? taskId ?? "",
        matched_by: matchedBy,
        planned_days: plannedDays,
        feasible: null,
        risk: "unknown",
        risk_label: RISK_LABELS.unknown,
        on_time_probability: null,
        suggested_days_typical: null,
        suggested_days_safe: null,
        suggested_days_very_safe: null,
        suggested_deadline_typical: null,
        suggested_deadline_safe: null,
        suggested_deadline_very_safe: null,
        confidence: "low",
        reason:
          "No history matches this task yet. Complete a few similar tasks and the deadline check will start learning from them.",
        stats: null,
      };
    }

    const typical = stats.p50 === null ? null : Math.ceil(stats.p50);
    const safe = stats.p80 === null ? null : Math.ceil(stats.p80);
    const verySafe = stats.p90 === null ? null : Math.ceil(stats.p90);
    const actuals = this.actuals.get(stats) ?? [];

    let onTimeProbability = null;
    if (plannedDays !== null && actuals.length) {
      const finished = actuals.filter((value) => value <= plannedDays).length;
      onTimeProbability = round(finished / actuals.length, 3);
    }

    let risk = "unknown";
    let feasible = null;
    if (plannedDays !== null && typical !== null && safe !== null) {
      if (plannedDays >= safe) {
        risk = "likely_feasible";
        feasible = true;
      } else if (plannedDays >= typical) {
        risk = "tight";
        feasible = true;
      } else {
        risk = "unlikely";
        feasible = false;
      }
    }

    const confidence =
      stats.count >= 80 ? "high" : stats.count >= 30 ? "medium" : "low";

    const deadlineFor = (days) =>
      addedDay !== null && days !== null
        ? formatDay(addedDay + days, outputDateFormat)
        : null;

    const parts = [
      `Based on ${stats.count} past "${stats.task}" task${
        stats.count === 1 ? "" : "s"
      }: typical ${typical}d, safe (p80) ${safe}d, very safe (p90) ${verySafe}d.`,
    ];
    if (stats.on_time_rate !== null) {
      parts.push(
        `Finished on time ${Math.round(stats.on_time_rate * 1000) / 10}% of the time (avg planned ${stats.avg_planned}d vs avg actual ${stats.avg_actual ?? "—"}d).`,
      );
    }

    if (plannedDays !== null && typical !== null && safe !== null) {
      if (risk === "likely_feasible") {
        parts.push(
          `Your ${plannedDays}d plan meets the safe duration; likely feasible.`,
        );
      } else if (risk === "tight") {
        parts.push(
          `Your ${plannedDays}d plan is around the typical duration but below the safe buffer. Feasible but tight — ${safe}d would be safer.`,
        );
      } else {
        parts.push(
          `Your ${plannedDays}d plan is below the typical ${typical}d; unlikely to finish on time. Suggest ${typical}d (typical) or ${safe}d (safer).`,
        );
      }
    }

    if (
      stats.max_actual !== null &&
      stats.p90 !== null &&
      stats.max_actual > stats.p90 + 3
    ) {
      parts.push(
        `Note: this task has high-variance outliers (max ${stats.max_actual}d).`,
      );
    }

    return {
      task_id: stats.task_id || null,
      task: stats.task,
      matched_by: matchedBy,
      planned_days: plannedDays,
      feasible,
      risk,
      risk_label: RISK_LABELS[risk],
      on_time_probability: onTimeProbability,
      suggested_days_typical: typical,
      suggested_days_safe: safe,
      suggested_days_very_safe: verySafe,
      suggested_deadline_typical: deadlineFor(typical),
      suggested_deadline_safe: deadlineFor(safe),
      suggested_deadline_very_safe: deadlineFor(verySafe),
      confidence,
      reason: parts.join(" "),
      stats,
    };
  }

  allTaskStats() {
    const numeric = (taskId) => {
      const digits = String(taskId).replace(/\D/g, "");
      return digits ? Number(digits) : Number.POSITIVE_INFINITY;
    };

    return [...this.statsById.values()]
      .sort((a, b) => {
        const first = numeric(a.task_id);
        const second = numeric(b.task_id);
        return first === second
          ? String(a.task_id).localeCompare(String(b.task_id))
          : first - second;
      })
      .map((stats) => ({ ...stats }));
  }
}
