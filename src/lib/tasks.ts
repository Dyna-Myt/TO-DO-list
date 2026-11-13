import type { AppView, Priority, Task, TaskFilter } from "../types";

export interface FilterCounts {
  all: number;
  active: number;
  due: number;
  overdue: number;
  completed: number;
}

export interface TaskOverview {
  total: number;
  open: number;
  completed: number;
  needsAttention: number;
  percentage: number;
}

function endOfToday(now: Date) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function getFilterCounts(tasks: Task[], now = new Date()): FilterCounts {
  let active = 0;
  let due = 0;
  let overdue = 0;
  let completed = 0;
  const nowTime = now.getTime();

  tasks.forEach((task) => {
    if (task.completed) {
      completed += 1;
      return;
    }

    active += 1;
    if (task.deadline) {
      due += 1;
      if (new Date(task.deadline).getTime() < nowTime) overdue += 1;
    }
  });

  return { all: tasks.length, active, due, overdue, completed };
}

export function getOverview(tasks: Task[], now = new Date()): TaskOverview {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const open = total - completed;
  const attentionEnd = endOfToday(now);
  const needsAttention = tasks.filter(
    (task) =>
      !task.completed &&
      task.deadline !== null &&
      new Date(task.deadline).getTime() <= attentionEnd,
  ).length;
  const progressTotal = tasks.reduce(
    (sum, task) => sum + (task.completed ? 100 : Math.min(100, Math.max(0, task.progress))),
    0,
  );

  return {
    total,
    open,
    completed,
    needsAttention,
    percentage: total ? Math.round(progressTotal / total) : 0,
  };
}

function compareTasks(first: Task, second: Task) {
  if (first.completed !== second.completed) return first.completed ? 1 : -1;

  if (first.completed && second.completed) {
    return (
      new Date(second.completedAt ?? second.updatedAt).getTime() -
      new Date(first.completedAt ?? first.updatedAt).getTime()
    );
  }

  const firstDeadline = first.deadline
    ? new Date(first.deadline).getTime()
    : Number.POSITIVE_INFINITY;
  const secondDeadline = second.deadline
    ? new Date(second.deadline).getTime()
    : Number.POSITIVE_INFINITY;

  if (firstDeadline !== secondDeadline) return firstDeadline - secondDeadline;

  const priorityRank = { high: 0, medium: 1, low: 2 };
  const priorityDifference =
    priorityRank[second.priority] - priorityRank[first.priority];
  if (priorityDifference !== 0) return priorityDifference;

  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

export function getVisibleTasks(
  tasks: Task[],
  filter: TaskFilter,
  search: string,
  now = new Date(),
) {
  const query = search.trim().toLocaleLowerCase();
  const nowTime = now.getTime();

  return tasks
    .filter((task) => {
      if (filter === "active" && task.completed) return false;
      if (filter === "completed" && !task.completed) return false;
      if (filter === "due" && (task.completed || !task.deadline)) return false;
      if (filter === "overdue") {
        if (task.completed || !task.deadline) return false;
        if (new Date(task.deadline).getTime() >= nowTime) return false;
      }

      if (!query) return true;
      return `${task.title} ${task.notes} ${task.ownerUsername ?? ""}`
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort(compareTasks);
}

/**
 * The tasks a sidebar view is built from, before the status tabs,
 * category/priority selects, or search box narrow them down.
 */
export function getBaseTasks(tasks: Task[], view: AppView, now = new Date()) {
  const endToday = endOfToday(now);

  return tasks.filter((task) => {
    if (view === "completed") return task.completed;
    if (view === "today") {
      return Boolean(
        task.deadline && new Date(task.deadline).getTime() <= endToday,
      );
    }
    if (view === "upcoming") {
      return Boolean(
        task.deadline && new Date(task.deadline).getTime() > endToday,
      );
    }
    if (view === "important") return task.priority === "high";
    if (view === "focus") return !task.completed;
    if (view === "calendar") return task.deadline !== null;
    return true;
  });
}

export interface TaskQuery {
  view: AppView;
  filter: TaskFilter;
  search: string;
  category: string;
  priority: Priority | "all";
  now?: Date;
}

export function getViewTasks(tasks: Task[], query: TaskQuery) {
  const now = query.now ?? new Date();
  const nowTime = now.getTime();
  const endToday = endOfToday(now);
  const search = query.search.trim().toLocaleLowerCase();
  const appliesStatusFilter =
    query.view === "tasks" ||
    query.view === "today" ||
    query.view === "upcoming" ||
    query.view === "important";

  return tasks
    .filter((task) => {
      if (query.view === "completed" && !task.completed) return false;
      if (query.view === "today") {
        if (!task.deadline) return false;
        if (new Date(task.deadline).getTime() > endToday) return false;
      }
      if (query.view === "upcoming") {
        if (!task.deadline) return false;
        if (new Date(task.deadline).getTime() <= endToday) return false;
      }
      if (query.view === "important" && task.priority !== "high") return false;
      if (query.view === "focus" && task.completed) return false;

      if (appliesStatusFilter) {
        if (query.filter === "active" && task.completed) return false;
        if (query.filter === "completed" && !task.completed) return false;
        if (query.filter === "due") {
          if (task.completed || !task.deadline) return false;
        }
        if (query.filter === "overdue") {
          if (task.completed || !task.deadline) return false;
          if (new Date(task.deadline).getTime() >= nowTime) return false;
        }
      }

      if (query.category !== "all" && task.category !== query.category) {
        return false;
      }
      if (query.priority !== "all" && task.priority !== query.priority) {
        return false;
      }

      if (!search) return true;
      return `${task.title} ${task.notes} ${task.category} ${
        task.ownerUsername ?? ""
      }`
        .toLocaleLowerCase()
        .includes(search);
    })
    .sort(compareTasks);
}

export function buildListSummary(
  visibleCount: number,
  totalCount: number,
  openCount: number,
  filter: TaskFilter,
  search: string,
) {
  if (totalCount === 0) return "No tasks yet";

  if (search.trim()) {
    return `${visibleCount} of ${totalCount} task${totalCount === 1 ? "" : "s"} found`;
  }

  if (filter === "all") {
    return `${totalCount} task${totalCount === 1 ? "" : "s"} · ${openCount} open`;
  }

  const labels: Record<Exclude<TaskFilter, "all">, string> = {
    active: "active",
    due: "due",
    overdue: "overdue",
    completed: "completed",
  };

  return `${visibleCount} ${labels[filter]} task${visibleCount === 1 ? "" : "s"}`;
}
