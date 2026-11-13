import { Flag, Plus, Tag, Trash2 } from "lucide-react";
import type { Priority, TaskFilter } from "../types";
import type { FilterCounts } from "../lib/tasks";

const STATUS_TABS: Array<{ value: TaskFilter; label: string; count: keyof FilterCounts }> = [
  { value: "all", label: "All", count: "all" },
  { value: "active", label: "Pending", count: "active" },
  { value: "overdue", label: "Overdue", count: "overdue" },
  { value: "completed", label: "Done", count: "completed" },
];

interface TaskToolbarProps {
  filter: TaskFilter;
  counts: FilterCounts;
  category: string;
  categories: string[];
  priority: Priority | "all";
  showStatusTabs: boolean;
  remaining: number;
  clearDisabled: boolean;
  onFilterChange: (filter: TaskFilter) => void;
  onCategoryChange: (category: string) => void;
  onPriorityChange: (priority: Priority | "all") => void;
  onAddTask: () => void;
  onClearCompleted: () => void;
}

export function TaskToolbar({
  filter,
  counts,
  category,
  categories,
  priority,
  showStatusTabs,
  remaining,
  clearDisabled,
  onFilterChange,
  onCategoryChange,
  onPriorityChange,
  onAddTask,
  onClearCompleted,
}: TaskToolbarProps) {
  return (
    <div className="task-toolbar">
      <div className="task-toolbar-main">
        {showStatusTabs ? (
          <div className="status-tabs" role="group" aria-label="Filter tasks by status">
            {STATUS_TABS.map((option) => (
              <button
                key={option.value}
                className={`status-tab${filter === option.value ? " is-active" : ""}`}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => onFilterChange(option.value)}
              >
                <span>{option.label}</span>
                <span className="filter-count">{counts[option.count]}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="task-toolbar-label">All tasks in this view</p>
        )}

        <div className="task-toolbar-filters">
          <label className="mini-select">
            <Tag aria-hidden="true" />
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="mini-select">
            <Flag aria-hidden="true" />
            <span className="sr-only">Filter by priority</span>
            <select
              value={priority}
              onChange={(event) =>
                onPriorityChange(event.target.value as Priority | "all")
              }
            >
              <option value="all">Any priority</option>
              <option value="high">High</option>
              <option value="medium">Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
      </div>

      <div className="task-toolbar-foot">
        <span className="tasks-left">
          <strong>{remaining}</strong> task{remaining === 1 ? "" : "s"} left
        </span>
        <div className="task-toolbar-actions">
          <button className="text-button" type="button" onClick={onAddTask}>
            <Plus aria-hidden="true" />
            Add task
          </button>
          <button
            className="text-button text-button-danger"
            type="button"
            onClick={onClearCompleted}
            disabled={clearDisabled}
          >
            <Trash2 aria-hidden="true" />
            Clear completed
          </button>
        </div>
      </div>
    </div>
  );
}
