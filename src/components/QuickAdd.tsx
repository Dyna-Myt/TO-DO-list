import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Clock3,
  Flag,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Sparkles,
  Tag,
  Users,
  Wand2,
} from "lucide-react";
import type { Priority, TaskDraft } from "../types";
import { taskCategories } from "../config/views";
import { dateInputForOffset, toIsoFromDateTimeInput } from "../lib/dates";
import { suggestTask } from "../lib/suggest";
import { DeadlineCheck } from "./DeadlineCheck";

interface QuickAddProps {
  disabled: boolean;
  scopeLabel: string;
  scopeKind: "personal" | "team";
  focusSignal?: number;
  onAdd: (draft: TaskDraft) => Promise<boolean>;
}

export function QuickAdd({
  disabled,
  scopeLabel,
  scopeKind,
  focusSignal = 0,
  onAdd,
}: QuickAddProps) {
  const [title, setTitle] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusSignal) return;
    titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleRef.current?.focus();
  }, [focusSignal]);

  const suggestion = suggestTask(title);
  const showSuggestion =
    suggestion !== null &&
    (suggestion.category !== category ||
      (suggestion.priority !== undefined && suggestion.priority !== priority) ||
      (suggestion.date !== undefined && suggestion.date !== dateValue));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      titleRef.current?.focus();
      return;
    }

    setSubmitting(true);
    const added = await onAdd({
      title: cleanTitle,
      notes: "",
      category,
      deadline: toIsoFromDateTimeInput(dateValue, timeValue),
      priority,
    });
    setSubmitting(false);

    if (added) {
      setTitle("");
      setDateValue("");
      setTimeValue("");
      setCategory("General");
      setPriority("medium");
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    if (suggestion.category) setCategory(suggestion.category);
    if (suggestion.priority) setPriority(suggestion.priority);
    if (suggestion.date) setDateValue(suggestion.date);
  }

  const isDisabled = disabled || submitting;

  return (
    <form className="quick-add" autoComplete="off" onSubmit={handleSubmit}>
      <div className="quick-add-head">
        <div>
          <p className="quick-scope" data-kind={scopeKind}>
            {scopeKind === "team" ? (
              <Users aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
            <span>
              {scopeKind === "team"
                ? `Shared with ${scopeLabel}`
                : "Private to you"}
            </span>
          </p>
          <h2>What needs to be done?</h2>
        </div>
        <span className="quick-mode">
          <Sparkles aria-hidden="true" />
          Quick add
        </span>
      </div>

      <div className="quick-add-title">
        <span className="quick-add-plus" aria-hidden="true">
          <Plus />
        </span>
        <label className="sr-only" htmlFor="quick-add-title">
          Task name
        </label>
        <input
          ref={titleRef}
          id="quick-add-title"
          type="text"
          maxLength={140}
          placeholder="What needs to be done?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={disabled}
          required
        />
        <button className="primary-button" type="submit" disabled={isDisabled}>
          {submitting ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          <span>{submitting ? "Adding…" : "Quick add"}</span>
        </button>
      </div>

      <div className="quick-add-row">
        <div className="quick-chips">
          <button
            className="quick-chip"
            type="button"
            onClick={() => setDateValue(dateInputForOffset(0))}
            disabled={disabled}
          >
            Today
          </button>
          <button
            className="quick-chip"
            type="button"
            onClick={() => setDateValue(dateInputForOffset(1))}
            disabled={disabled}
          >
            Tomorrow
          </button>
        </div>

        <label className="quick-field">
          <span className="quick-field-label">
            <CalendarDays aria-hidden="true" />
            Deadline
          </span>
          <input
            type="date"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
            disabled={disabled}
          />
        </label>

        <label className="quick-field quick-field-time">
          <span className="quick-field-label">
            <Clock3 aria-hidden="true" />
            Time <em>optional</em>
          </span>
          <input
            type="time"
            value={timeValue}
            onChange={(event) => setTimeValue(event.target.value)}
            disabled={disabled}
          />
        </label>

        <label className="quick-field">
          <span className="quick-field-label">
            <Tag aria-hidden="true" />
            Category
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={disabled}
          >
            {taskCategories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="quick-field quick-field-priority">
          <span className="quick-field-label">
            <Flag aria-hidden="true" />
            Priority
          </span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            disabled={disabled}
          >
            <option value="high">High</option>
            <option value="medium">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <DeadlineCheck
        title={title}
        deadlineIso={toIsoFromDateTimeInput(dateValue, timeValue)}
        onApplyDeadline={(isoDate) => setDateValue(isoDate)}
      />

      {showSuggestion && suggestion ? (
        <div className="quick-suggest" role="status">
          <Wand2 aria-hidden="true" />
          <span>
            Smart suggestion: <strong>{suggestion.label}</strong>
          </span>
          <button
            className="quick-suggest-apply"
            type="button"
            onClick={applySuggestion}
            disabled={disabled}
          >
            Apply
          </button>
        </div>
      ) : null}

      <p className="quick-add-foot">
        Press Enter to create
        <span aria-hidden="true">·</span>
        Smart suggestions update as you type, entirely on this computer
      </p>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
