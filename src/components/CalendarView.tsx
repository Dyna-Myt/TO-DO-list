import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Task, TeamRole } from "../types";
import { formatMonthYear } from "../lib/dates";
import { TaskCard } from "./TaskCard";

interface CalendarViewProps {
  tasks: Task[];
  currentUserId: string;
  teamRole: TeamRole | null;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddTask: () => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function taskDateKey(task: Task) {
  return task.deadline ? dateKey(new Date(task.deadline)) : "";
}

export function CalendarView({
  tasks,
  currentUserId,
  teamRole,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onAddTask,
}: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today));

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const key = taskDateKey(task);
      if (!key) return;
      const bucket = map.get(key);
      if (bucket) bucket.push(task);
      else map.set(key, [task]);
    });
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        key: dateKey(date),
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: dateKey(date) === dateKey(today),
        tasks: grouped.get(dateKey(date)) ?? [],
      };
    });
  }, [cursor, grouped, today]);

  const selectedTasks = grouped.get(selectedKey) ?? [];
  const selectedDate = selectedKey
    ? new Date(`${selectedKey}T00:00:00`)
    : new Date();

  function canManage(task: Task) {
    if (!task.teamId) return task.ownerId === currentUserId;
    return task.ownerId === currentUserId || teamRole === "owner";
  }

  function shiftMonth(delta: number) {
    setCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  return (
    <div className="calendar-view">
      <section className="calendar-card" aria-label="Task calendar">
        <header className="calendar-head">
          <div>
            <p className="section-kicker">Calendar</p>
            <h2>{formatMonthYear(cursor)}</h2>
          </div>
          <div className="calendar-controls">
            <button
              className="icon-button"
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedKey(dateKey(now));
              }}
            >
              Today
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell) => (
            <button
              key={cell.key}
              className={`calendar-day${cell.inMonth ? "" : " is-outside"}${
                cell.isToday ? " is-today" : ""
              }${cell.key === selectedKey ? " is-selected" : ""}`}
              type="button"
              onClick={() => setSelectedKey(cell.key)}
              aria-label={`${cell.date.toDateString()} · ${cell.tasks.length} task${
                cell.tasks.length === 1 ? "" : "s"
              }`}
            >
              <span className="calendar-day-number">{cell.date.getDate()}</span>
              <span className="calendar-day-tasks">
                {cell.tasks.slice(0, 3).map((task) => (
                  <span
                    className={`calendar-chip priority-${task.priority}${
                      task.completed ? " is-complete" : ""
                    }`}
                    key={task.id}
                  >
                    {task.title}
                  </span>
                ))}
                {cell.tasks.length > 3 ? (
                  <span className="calendar-more">
                    +{cell.tasks.length - 3} more
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="calendar-day-panel" aria-label="Selected day">
        <header className="panel-head">
          <div>
            <p className="section-kicker">
              {selectedKey === dateKey(today) ? "Today" : "Selected day"}
            </p>
            <h2>
              {new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(selectedDate)}
            </h2>
          </div>
          <button className="text-button" type="button" onClick={onAddTask}>
            <Plus aria-hidden="true" />
            Add task
          </button>
        </header>

        {selectedTasks.length ? (
          <div className="calendar-task-list">
            {selectedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                disabled={busy}
                canManage={canManage(task)}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <span className="empty-icon" aria-hidden="true">
              <CalendarDays />
            </span>
            <h3>Nothing on this day</h3>
            <p>Pick another day, or add a task with a deadline.</p>
            <button className="text-link" type="button" onClick={onAddTask}>
              Add a task
            </button>
          </div>
        )}
      </section>

      {tasks.length === 0 ? (
        <p className="calendar-footnote">
          <Sparkles aria-hidden="true" />
          Tasks with deadlines will appear on this calendar.
        </p>
      ) : null}
    </div>
  );
}
