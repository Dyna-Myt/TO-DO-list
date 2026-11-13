import type { AppView, TaskFilter } from "../types";

export const taskCategories = [
  "General",
  "Home",
  "Errands",
  "Personal",
  "Software Engineering",
  "Design",
  "Meetings",
  "Communication",
  "Marketing",
  "Operations",
  "Research",
] as const;

export const viewMeta: Record<AppView, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your personal command centre.",
  },
  tasks: {
    title: "My Tasks",
    subtitle: "Everything on your plate, in one calm place.",
  },
  today: {
    title: "Today",
    subtitle: "Due today, plus anything overdue.",
  },
  upcoming: {
    title: "Upcoming",
    subtitle: "What is coming next, so you can plan ahead.",
  },
  completed: {
    title: "Completed",
    subtitle: "Everything you have already crossed off.",
  },
  important: {
    title: "Important",
    subtitle: "High-priority work that needs your attention.",
  },
  board: {
    title: "Board",
    subtitle: "Move work from pending to in progress to done.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Deadlines laid out across the month.",
  },
  focus: {
    title: "Focus",
    subtitle: "One task, one timer, no noise.",
  },
  history: {
    title: "History",
    subtitle: "Completed, reopened, and deleted tasks.",
  },
  settings: {
    title: "Settings",
    subtitle: "Workspace, appearance, and account.",
  },
};

export const listViews: AppView[] = [
  "tasks",
  "today",
  "upcoming",
  "important",
];

export function defaultFilterFor(view: AppView): TaskFilter {
  return view === "tasks" || view === "completed" ? "all" : "active";
}
