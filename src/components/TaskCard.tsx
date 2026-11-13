import { Check, Clock3, Eye, Pencil, Tag, Trash2, UserRound } from "lucide-react";
import type { Task } from "../types";
import { getDeadlineMeta, truncate } from "../lib/dates";

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  disabled: boolean;
  canManage: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export function TaskCard({
  task,
  currentUserId,
  disabled,
  canManage,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const deadline = getDeadlineMeta(task);
  const shortTitle = truncate(task.title, 60);
  const overdue = !task.completed && deadline?.tone === "overdue";
  const isTeamTask = task.teamId !== null;
  const showProgress = task.progress > 0 || isTeamTask;
  const controlsDisabled = disabled || !canManage;

  return (
    <article
      className={`task-card${task.completed ? " is-complete" : ""}${
        overdue ? " is-overdue" : ""
      }`}
    >
      <button
        className="task-check"
        type="button"
        aria-pressed={task.completed}
        aria-label={
          task.completed
            ? `Mark “${shortTitle}” as active`
            : `Complete “${shortTitle}”`
        }
        title={
          canManage
            ? task.completed
              ? "Mark as active"
              : "Mark complete"
            : "Only the task owner or team owner can update this task"
        }
        onClick={() => onToggle(task)}
        disabled={controlsDisabled}
      >
        <Check aria-hidden="true" />
      </button>

      <div className="task-content">
        <div className="task-heading">
          <h3 className="task-title">{task.title}</h3>
          {canManage ? (
            <div className="task-actions">
              <button
                className="icon-button task-action"
                type="button"
                aria-label={`Edit “${shortTitle}”`}
                title="Edit task and progress"
                onClick={() => onEdit(task)}
                disabled={disabled}
              >
                <Pencil aria-hidden="true" />
              </button>
              <button
                className="icon-button task-action delete-action"
                type="button"
                aria-label={`Delete “${shortTitle}”`}
                title="Delete task"
                onClick={() => onDelete(task)}
                disabled={disabled}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="task-meta">
          <span className="meta-pill category-pill">
            <Tag aria-hidden="true" />
            {task.category}
          </span>
          {deadline ? (
            <span className={`meta-pill deadline-${deadline.tone}`}>
              <Clock3 aria-hidden="true" />
              {deadline.label}
            </span>
          ) : null}
          <span className={`meta-pill priority-${task.priority}`}>
            <span className="priority-dot" aria-hidden="true" />
            {PRIORITY_LABELS[task.priority]}
          </span>
          {isTeamTask ? (
            <span className="meta-pill owner-pill">
              <UserRound aria-hidden="true" />
              @{task.ownerUsername ?? "member"}
              {task.ownerId === currentUserId ? " (you)" : ""}
            </span>
          ) : null}
          {isTeamTask && !canManage ? (
            <span className="meta-pill view-only-pill">
              <Eye aria-hidden="true" />
              View only
            </span>
          ) : null}
        </div>

        {showProgress ? (
          <div className="task-progress">
            <div className="task-progress-head">
              <span>Progress</span>
              <strong>{task.progress}%</strong>
            </div>
            <div
              className="task-progress-track"
              role="progressbar"
              aria-label={`Progress on “${shortTitle}”`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={task.progress}
              aria-valuetext={`${task.progress}% complete`}
            >
              <span style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        ) : null}

        {task.notes ? <p className="task-note">{task.notes}</p> : null}
      </div>
    </article>
  );
}
