import {
  CheckCircle2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import type { Task, TaskFilter, TeamRole } from "../types";
import { truncate } from "../lib/dates";
import { TaskCard } from "./TaskCard";

interface TaskListProps {
  tasks: Task[];
  totalCount: number;
  filter: TaskFilter;
  search: string;
  summary: string;
  loading: boolean;
  disabled: boolean;
  currentUserId: string;
  teamName: string | null;
  teamRole: TeamRole | null;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onResetView: () => void;
  onAddTask: () => void;
}

function EmptyState({
  totalCount,
  filter,
  search,
  teamName,
  onResetView,
  onAddTask,
}: Pick<
  TaskListProps,
  "totalCount" | "filter" | "search" | "teamName" | "onResetView" | "onAddTask"
>) {
  let icon = teamName ? <Users /> : <Sparkles />;
  let title = teamName ? "Your team board is empty" : "A fresh start";
  let body = teamName
    ? "Add the first shared task above. Every team member will see it and its progress."
    : "Add your first task above. Give it a deadline if timing matters.";
  let action = "";
  let actionLabel = "";

  if (totalCount === 0) {
    action = "add";
    actionLabel = "Add a task";
  } else if (search.trim()) {
    icon = <Search />;
    title = "No matches";
    body = `Nothing matched “${truncate(search.trim(), 50)}” in this view.`;
    action = "reset";
    actionLabel = "Clear search";
  } else if (filter === "completed") {
    icon = <CheckCircle2 />;
    title = "No completed tasks yet";
    body = "Finish something and it will show up here, ready to look back on.";
    action = "reset";
    actionLabel = "View all tasks";
  } else if (filter === "overdue") {
    icon = <CheckCircle2 />;
    title = "Nothing overdue";
    body = "Everything is right on time. Keep it that way.";
    action = "reset";
    actionLabel = "View all tasks";
  } else if (filter === "active") {
    icon = <CheckCircle2 />;
    title = "Nothing left to do";
    body = "Every task is complete. Take a moment to enjoy it.";
    action = "reset";
    actionLabel = "View all tasks";
  }

  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? (
        <button
          className="text-link"
          type="button"
          onClick={action === "add" ? onAddTask : onResetView}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="task-list" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div className="task-skeleton" key={item}>
          <span className="skeleton-circle" />
          <div className="skeleton-content">
            <span className="skeleton-line skeleton-line-title" />
            <span className="skeleton-line skeleton-line-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskList({
  tasks,
  totalCount,
  filter,
  search,
  summary,
  loading,
  disabled,
  currentUserId,
  teamName,
  teamRole,
  onToggle,
  onEdit,
  onDelete,
  onResetView,
  onAddTask,
}: TaskListProps) {
  function canManage(task: Task) {
    if (!task.teamId) return task.ownerId === currentUserId;
    return task.ownerId === currentUserId || teamRole === "owner";
  }

  return (
    <>
      <h2 className="sr-only">{teamName ? `${teamName} tasks` : "Your tasks"}</h2>

      <div className="list-heading">
        <p className="list-summary" aria-live="polite">
          {loading ? "Loading tasks…" : summary}
        </p>
        <p className="save-indicator">
          <span className="save-dot" aria-hidden="true" />
          SQLite · saved locally
        </p>
      </div>

      {loading ? (
        <LoadingList />
      ) : tasks.length === 0 ? (
        <EmptyState
          totalCount={totalCount}
          filter={filter}
          search={search}
          teamName={teamName}
          onResetView={onResetView}
          onAddTask={onAddTask}
        />
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              disabled={disabled}
              canManage={canManage(task)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
