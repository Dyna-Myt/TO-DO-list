import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Flame,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Tag,
  Timer,
} from "lucide-react";
import type { Task, TeamRole } from "../types";
import { getDeadlineMeta } from "../lib/dates";

interface FocusViewProps {
  tasks: Task[];
  currentUserId: string;
  teamRole: TeamRole | null;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onAddTask: () => void;
}

const DURATIONS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "25 min", seconds: 25 * 60 },
  { label: "45 min", seconds: 45 * 60 },
];

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FocusView({
  tasks,
  currentUserId,
  teamRole,
  busy,
  onToggle,
  onEdit,
  onAddTask,
}: FocusViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duration, setDuration] = useState(DURATIONS[1].seconds);
  const [seconds, setSeconds] = useState(DURATIONS[1].seconds);
  const [running, setRunning] = useState(false);

  const selected =
    tasks.find((task) => task.id === selectedId) ?? tasks[0] ?? null;

  useEffect(() => {
    setSeconds(duration);
    setRunning(false);
  }, [duration, selected?.id]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const elapsed = duration - seconds;
  const ratio = duration ? elapsed / duration : 0;
  const circumference = 2 * Math.PI * 86;
  const deadline = selected ? getDeadlineMeta(selected) : null;
  const canManage = selected
    ? selected.teamId
      ? selected.ownerId === currentUserId || teamRole === "owner"
      : selected.ownerId === currentUserId
    : false;

  const focusQueue = useMemo(
    () =>
      tasks.filter((task) => !task.completed).slice(0, 8),
    [tasks],
  );

  if (!selected) {
    return (
      <div className="focus-view">
        <div className="focus-empty panel">
          <span className="empty-icon" aria-hidden="true">
            <Timer />
          </span>
          <h2>Nothing to focus on</h2>
          <p>
            Add a task and it will show up here, ready for a quiet work
            session.
          </p>
          <button className="primary-button" type="button" onClick={onAddTask}>
            <Sparkles aria-hidden="true" />
            Add a task
          </button>
        </div>
      </div>
    );
  }

  function choose(id: string) {
    setSelectedId(id);
    setSeconds(duration);
    setRunning(false);
  }

  function completeSelected() {
    if (!selected) return;
    onToggle(selected);
    setRunning(false);
    setSeconds(duration);
  }

  return (
    <div className="focus-view">
      <section className="focus-stage panel" aria-labelledby="focus-title">
        <p className="section-kicker">
          <Flame aria-hidden="true" />
          Focus session
        </p>
        <h2 id="focus-title">{selected.title}</h2>

        <div className="focus-meta">
          <span className="meta-pill category-pill">
            <Tag aria-hidden="true" />
            {selected.category}
          </span>
          {deadline ? (
            <span className={`meta-pill deadline-${deadline.tone}`}>
              <Clock3 aria-hidden="true" />
              {deadline.label}
            </span>
          ) : (
            <span className="meta-pill">No deadline</span>
          )}
        </div>

        <div className="focus-timer-wrap">
          <svg className="focus-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="focus-ring-track" cx="100" cy="100" r="86" />
            <circle
              className="focus-ring-value"
              cx="100"
              cy="100"
              r="86"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
            />
          </svg>
          <div className="focus-clock">
            <strong>{formatClock(seconds)}</strong>
            <span>{running ? "Stay with it" : "Ready when you are"}</span>
          </div>
        </div>

        <div className="focus-durations" role="group" aria-label="Session length">
          {DURATIONS.map((option) => (
            <button
              key={option.seconds}
              className={`quick-chip${
                duration === option.seconds ? " is-active" : ""
              }`}
              type="button"
              onClick={() => setDuration(option.seconds)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="focus-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setRunning((current) => !current)}
            disabled={seconds === 0}
          >
            {running ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {running ? "Pause" : seconds === 0 ? "Session done" : "Start focus"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setRunning(false);
              setSeconds(duration);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onEdit(selected)}
            disabled={busy || !canManage}
          >
            <Pencil aria-hidden="true" />
            Edit
          </button>
          <button
            className="secondary-button focus-complete"
            type="button"
            onClick={completeSelected}
            disabled={busy || !canManage}
          >
            <Check aria-hidden="true" />
            Mark complete
          </button>
        </div>

        <div className="focus-progress">
          <div className="task-progress-head">
            <span>Task progress</span>
            <strong>{selected.progress}%</strong>
          </div>
          <div
            className="task-progress-track"
            role="progressbar"
            aria-label="Task progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={selected.progress}
          >
            <span style={{ width: `${selected.progress}%` }} />
          </div>
        </div>
      </section>

      <aside className="focus-queue panel" aria-labelledby="focus-queue-title">
        <header className="panel-head">
          <div>
            <p className="section-kicker">Up next</p>
            <h2 id="focus-queue-title">Focus queue</h2>
          </div>
          <span className="count-pill">{focusQueue.length}</span>
        </header>

        {focusQueue.length ? (
          <ol className="focus-list">
            {focusQueue.map((task) => {
              const taskDeadline = getDeadlineMeta(task);
              return (
                <li key={task.id}>
                  <button
                    className={`focus-item${
                      task.id === selected.id ? " is-active" : ""
                    }`}
                    type="button"
                    onClick={() => choose(task.id)}
                  >
                    <span className="focus-item-dot" aria-hidden="true" />
                    <span className="focus-item-copy">
                      <strong>{task.title}</strong>
                      <small>
                        {task.category}
                        {taskDeadline ? ` · ${taskDeadline.label}` : ""}
                      </small>
                    </span>
                    <span className={`priority-badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="dash-activity-empty">
            You are all caught up. Add a task to start another session.
          </p>
        )}
      </aside>
    </div>
  );
}
