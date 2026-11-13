import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Recommendation, RecommendationRisk } from "../types";
import { api } from "../lib/api";
import { dateInputForOffset, formatDate, toDateInputValue } from "../lib/dates";

interface DeadlineCheckProps {
  title: string;
  deadlineIso: string | null;
  onApplyDeadline: (isoDate: string) => void;
}

const riskIcon: Record<RecommendationRisk, typeof ShieldCheck> = {
  likely_feasible: ShieldCheck,
  tight: CalendarClock,
  unlikely: ShieldAlert,
  unknown: Sparkles,
};

const riskLabel: Record<RecommendationRisk, string> = {
  likely_feasible: "Likely feasible",
  tight: "Tight",
  unlikely: "Unlikely",
  unknown: "No match yet",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function plannedDaysFor(deadlineIso: string | null) {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return null;
  const days = Math.round(
    (startOfDay(deadline).getTime() - startOfDay(new Date()).getTime()) / DAY_MS,
  );
  return Math.max(0, days);
}

function formatSuggestion(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? isoDate : formatDate(date);
}

/**
 * Local deadline check. It asks the Taskflow API how long similar tasks have
 * historically taken and offers a realistic date. Task text stays on this
 * computer; the request only travels to the local API.
 */
export function DeadlineCheck({
  title,
  deadlineIso,
  onApplyDeadline,
}: DeadlineCheckProps) {
  const cleanTitle = title.trim();
  const plannedDays = plannedDaysFor(deadlineIso);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (cleanTitle.length < 3) {
      requestId.current += 1;
      setRecommendation(null);
      setLoading(false);
      setError("");
      return;
    }

    const id = (requestId.current += 1);
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { recommendation: next } = await api.recommend({
          taskName: cleanTitle,
          plannedDays,
          addedDate: dateInputForOffset(0),
        });
        if (requestId.current !== id) return;
        setRecommendation(next);
        setError("");
      } catch (caught) {
        if (requestId.current !== id) return;
        setRecommendation(null);
        setError(
          caught instanceof Error
            ? caught.message
            : "The deadline check is unavailable right now.",
        );
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [cleanTitle, plannedDays]);

  if (cleanTitle.length < 3) return null;

  const risk = recommendation?.risk ?? "unknown";
  const hasMatch = Boolean(recommendation?.stats);
  const Icon = riskIcon[risk];
  const suggestedDate =
    recommendation?.suggested_deadline_safe ??
    recommendation?.suggested_deadline_typical;
  const currentDate = toDateInputValue(deadlineIso);
  const canApply = Boolean(suggestedDate && suggestedDate !== currentDate);

  const badge = !hasMatch
    ? loading
      ? "Checking…"
      : "No match yet"
    : plannedDays === null
      ? "Suggested"
      : risk === "unknown"
        ? "Checking…"
        : riskLabel[risk];

  const summary = hasMatch
    ? `Usually takes ~${recommendation?.suggested_days_typical}d · safe ${recommendation?.suggested_days_safe}d · ${recommendation?.stats?.count ?? 0} similar task${
        recommendation?.stats?.count === 1 ? "" : "s"
      }.`
    : "No close match in your history yet.";

  const probability = recommendation?.on_time_probability;

  return (
    <div
      className="deadline-check"
      data-risk={risk}
      role="status"
      aria-live="polite"
    >
      <span className="deadline-check-icon" aria-hidden="true">
        {loading && !recommendation ? (
          <LoaderCircle className="spin" />
        ) : (
          <Icon />
        )}
      </span>

      <div className="deadline-check-copy">
        <p className="deadline-check-head">
          <strong>Deadline check</strong>
          <span className="deadline-check-badge">{badge}</span>
          {recommendation && recommendation.confidence !== "low" ? (
            <span className="deadline-check-confidence">
              {recommendation.confidence} confidence
            </span>
          ) : null}
        </p>

        {error ? (
          <p className="deadline-check-note">{error}</p>
        ) : (
          <>
            <p className="deadline-check-note">
              {summary}
              {plannedDays !== null ? ` You planned ${plannedDays}d.` : ""}
            </p>
            {probability !== null && probability !== undefined ? (
              <p className="deadline-check-note deadline-check-probability">
                Finished on time in {Math.round(probability * 100)}% of similar
                tasks.
              </p>
            ) : null}
          </>
        )}
      </div>

      {canApply && suggestedDate ? (
        <button
          className="deadline-check-apply"
          type="button"
          onClick={() => onApplyDeadline(suggestedDate)}
        >
          <Check aria-hidden="true" />
          <span>Use {formatSuggestion(suggestedDate)}</span>
        </button>
      ) : null}
    </div>
  );
}
