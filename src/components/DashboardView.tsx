import { useMemo } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  ListChecks,
  LockKeyhole,
  Plus,
  Target,
  TimerReset,
  Users,
} from "lucide-react";
import type {
  AppView,
  HistoryEntry,
  Priority,
  Task,
  Team,
  TeamRole,
} from "../types";
import type { DeadlineMeta } from "../lib/dates";
import type { TaskOverview } from "../lib/tasks";
import { getDeadlineMeta, formatToday, greetingFor } from "../lib/dates";

interface DashboardViewProps {
  tasks: Task[];
  history: HistoryEntry[];
  now: Date;
  overview: TaskOverview;
  team: Team | null;
  currentUserId: string;
  teamRole: TeamRole | null;
  username: string;
  busy: boolean;
  onEdit: (task: Task) => void;
  onAddTask: () => void;
  onNavigate: (view: AppView) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: "short" });

const PRIORITIES: Array<{ key: Priority; label: string }> = [
  { key: "high", label: "High priority" },
  { key: "medium", label: "Normal" },
  { key: "low", label: "Low priority" },
];

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dueTime(task: Task) {
  return task.deadline ? new Date(task.deadline).getTime() : null;
}

function deadlinePillLabel(task: Task, now: Date, meta: DeadlineMeta | null) {
  if (!meta) return null;
  if (meta.tone === "overdue") return "Overdue";
  if (meta.tone === "complete") return "Done";

  const due = dueTime(task);
  if (due !== null) {
    const dueDate = new Date(due);
    if (isSameDay(dueDate, now)) return "Today";

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isSameDay(dueDate, tomorrow)) return "Tomorrow";
  }

  return meta.tone === "upcoming" ? "This week" : "Later";
}

export function DashboardView({
  tasks,
  history,
  now,
  overview,
  team,
  currentUserId,
  teamRole,
  username,
  busy,
  onEdit,
  onAddTask,
  onNavigate,
}: DashboardViewProps) {
  const openTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed),
    [tasks],
  );

  const nowTime = now.getTime();
  const overdue = openTasks.filter((task) => {
    const due = dueTime(task);
    return due !== null && due < nowTime;
  });
  const dueToday = openTasks.filter((task) => {
    const due = dueTime(task);
    return due !== null && isSameDay(new Date(due), now);
  });
  const dueThisWeek = openTasks.filter((task) => {
    const due = dueTime(task);
    return due !== null && due >= nowTime && due <= nowTime + 7 * DAY_MS;
  });
  const completedThisWeek = completedTasks.filter((task) => {
    if (!task.completedAt) return false;
    return new Date(task.completedAt).getTime() >= nowTime - 7 * DAY_MS;
  }).length;

  const completionDays = useMemo(() => {
    const days = new Set<string>();
    tasks.forEach((task) => {
      if (task.completed && task.completedAt) {
        days.add(dayKey(new Date(task.completedAt)));
      }
    });
    history.forEach((entry) => {
      if (entry.type === "completed") days.add(dayKey(new Date(entry.at)));
    });
    return days;
  }, [tasks, history]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = startOfDay(now);
    if (!completionDays.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (completionDays.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [completionDays, now]);

  const rhythm = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = startOfDay(now);
      day.setDate(day.getDate() - (6 - index));
      return day;
    });
    const fromTasks = days.map(
      (day) =>
        completedTasks.filter(
          (task) =>
            task.completedAt && isSameDay(new Date(task.completedAt), day),
        ).length,
    );
    const counts = fromTasks.some((count) => count > 0)
      ? fromTasks
      : days.map(
          (day) =>
            history.filter(
              (entry) =>
                entry.type === "completed" &&
                isSameDay(new Date(entry.at), day),
            ).length,
        );

    return days.map((day, index) => ({
      key: dayKey(day),
      label: weekdayShort.format(day),
      count: counts[index],
      isToday: isSameDay(day, now),
    }));
  }, [completedTasks, history, now]);

  const rhythmMax = Math.max(1, ...rhythm.map((day) => day.count));
  const rhythmTotal = rhythm.reduce((sum, day) => sum + day.count, 0);

  const priorityMix = PRIORITIES.map((priority) => ({
    ...priority,
    count: openTasks.filter((task) => task.priority === priority.key).length,
  }));
  const priorityTotal = openTasks.length || 1;

  const upcoming = useMemo(
    () =>
      openTasks
        .filter((task) => task.deadline)
        .sort((first, second) => (dueTime(first) ?? 0) - (dueTime(second) ?? 0))
        .slice(0, 5),
    [openTasks],
  );

  const canManage = (task: Task) =>
    !task.teamId
      ? task.ownerId === currentUserId
      : task.ownerId === currentUserId || teamRole === "owner";

  const displayName = (() => {
    const first = username.split(/[._@\s-]+/).filter(Boolean)[0] ?? username;
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : username;
  })();

  const workspaceLabel = team
    ? `${team.name} · team workspace`
    : "Personal workspace";

  const summary = overdue.length
    ? `${overdue.length} task${overdue.length === 1 ? "" : "s"} ${
        overdue.length === 1 ? "needs" : "need"
      } attention. Clear the overdue items first, then keep the momentum.`
    : openTasks.length
      ? `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}${
          dueToday.length ? `, ${dueToday.length} due today` : ""
        }. A focused block will move things forward.`
      : "Everything is wrapped up. A great moment to plan what comes next.";

  return (
    <div className="dashboard">
      <section className="dash-hero" aria-labelledby="dash-greeting">
        <div className="dash-hero-copy">
          <p className="section-kicker">
            {workspaceLabel} · {formatToday(now)}
          </p>
          <h2 id="dash-greeting">
            {greetingFor(now)}, {displayName}.
          </h2>
          <p className="dash-hero-sub">{summary}</p>
        </div>
        <div className="dash-hero-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onAddTask}
            disabled={busy}
          >
            <Plus aria-hidden="true" />
            <span>Create task</span>
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onNavigate("tasks")}
          >
            <ListChecks aria-hidden="true" />
            <span>View all tasks</span>
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onNavigate("focus")}
          >
            <TimerReset aria-hidden="true" />
            <span>Focus mode</span>
          </button>
          <span className="dash-streak" title="Consecutive days with a completed task">
            <Flame aria-hidden="true" />
            {streak} day streak
          </span>
        </div>
      </section>

      <section className="dash-stats" aria-label="Task summary">
        <article className="stat-card">
          <span className="stat-icon stat-icon-sage" aria-hidden="true">
            <ListChecks />
          </span>
          <div>
            <p className="stat-number">{openTasks.length}</p>
            <p className="stat-label">Open tasks</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-sand" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <div>
            <p className="stat-number">{completedTasks.length}</p>
            <p className="stat-label">Completed</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-red" aria-hidden="true">
            <Clock3 />
          </span>
          <div>
            <p className="stat-number">{overdue.length}</p>
            <p className="stat-label">Overdue</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon-amber" aria-hidden="true">
            <CalendarClock />
          </span>
          <div>
            <p className="stat-number">{dueThisWeek.length}</p>
            <p className="stat-label">Due this week</p>
          </div>
        </article>
      </section>

      <div className="dash-grid-top">
        <section
          className="panel dash-rhythm"
          aria-labelledby="dash-rhythm-title"
        >
          <header className="panel-head">
            <div>
              <p className="section-kicker">Momentum</p>
              <h2 id="dash-rhythm-title">Completion rhythm</h2>
              <p className="dash-panel-sub">
                Tasks finished each day over the last week.
              </p>
            </div>
          </header>

          <div
            className="rhythm-chart"
            role="img"
            aria-label={`${rhythmTotal} tasks finished in the last seven days`}
          >
            {rhythm.map((day) => (
              <div
                className={`rhythm-col${day.isToday ? " is-today" : ""}`}
                key={day.key}
              >
                <span className="rhythm-value">{day.count}</span>
                <div className="rhythm-track">
                  <span
                    className="rhythm-bar"
                    style={{
                      height: `${Math.max(4, (day.count / rhythmMax) * 100)}%`,
                    }}
                  />
                </div>
                <span className="rhythm-label">{day.label}</span>
              </div>
            ))}
          </div>

          {rhythmTotal === 0 ? (
            <p className="dash-panel-note">
              No completions in the last 7 days yet. Finish one task to start the
              rhythm.
            </p>
          ) : null}
        </section>

        <section
          className="panel dash-progress"
          aria-labelledby="dash-progress-title"
        >
          <header className="panel-head">
            <div>
              <p className="section-kicker">Overall progress</p>
              <h2 id="dash-progress-title">{overview.percentage}% complete</h2>
              <p className="dash-panel-sub">
                {overview.completed} of {overview.total} task
                {overview.total === 1 ? "" : "s"} done
              </p>
            </div>
            {team ? (
              <Users aria-hidden="true" className="panel-head-icon" />
            ) : (
              <LockKeyhole aria-hidden="true" className="panel-head-icon" />
            )}
          </header>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Overall completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overview.percentage}
          >
            <span style={{ width: `${overview.percentage}%` }} />
          </div>

          <div className="dash-progress-stats">
            <div>
              <strong>{overview.open}</strong>
              <small>Open</small>
            </div>
            <div>
              <strong>{overview.needsAttention}</strong>
              <small>Needs attention</small>
            </div>
            <div>
              <strong>{overview.completed}</strong>
              <small>Done</small>
            </div>
          </div>

          <div className="dash-progress-foot">
            <span className="dash-range-chip">Last 7 days</span>
            <span>
              {completedThisWeek} task{completedThisWeek === 1 ? "" : "s"} finished
            </span>
          </div>

          {team ? (
            <div className="dash-members">
              <p className="dash-members-label">
                {team.members.length} member{team.members.length === 1 ? "" : "s"}
              </p>
              <div className="dash-member-list">
                {team.members.map((member) => (
                  <span className="member-chip" key={member.id}>
                    <span className="member-avatar" aria-hidden="true">
                      {member.username.slice(0, 2).toUpperCase()}
                    </span>
                    @{member.username}
                    {member.role === "owner" ? <em>owner</em> : null}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="dash-private">
              <LockKeyhole aria-hidden="true" />
              These tasks are private to you. Switch to a team to share work.
            </p>
          )}
        </section>
      </div>

      <div className="dash-grid-lower">
        <section
          className="panel dash-upcoming"
          aria-labelledby="dash-upcoming-title"
        >
          <header className="panel-head">
            <div>
              <p className="section-kicker">Upcoming</p>
              <h2 id="dash-upcoming-title">Upcoming deadlines</h2>
              <p className="dash-panel-sub">The next tasks on the clock.</p>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => onNavigate("tasks")}
            >
              View all
              <ChevronRight aria-hidden="true" />
            </button>
          </header>

          {upcoming.length ? (
            <div className="dash-deadline-list">
              {upcoming.map((task) => {
                const meta = getDeadlineMeta(task);
                return (
                  <button
                    className="dash-deadline-row"
                    key={task.id}
                    type="button"
                    onClick={() => onEdit(task)}
                    disabled={busy || !canManage(task)}
                    title={canManage(task) ? "Open task" : "View task"}
                  >
                    <span
                      className={`priority-dot priority-${task.priority}`}
                      aria-hidden="true"
                    />
                    <span className="dash-deadline-copy">
                      <span className="dash-deadline-title">{task.title}</span>
                      <span className="dash-deadline-meta">
                        {task.category}
                        {meta ? ` · ${meta.label}` : ""}
                      </span>
                    </span>
                    {meta ? (
                      <span className={`dash-deadline-pill is-${meta.tone}`}>
                        {deadlinePillLabel(task, now, meta)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="dash-panel-empty">
              <strong>No deadlines scheduled.</strong>
              Add a due date to keep this list alive.
            </div>
          )}
        </section>

        <section
          className="panel dash-priority"
          aria-labelledby="dash-priority-title"
        >
          <header className="panel-head">
            <div>
              <p className="section-kicker">Workload</p>
              <h2 id="dash-priority-title">Priority mix</h2>
              <p className="dash-panel-sub">Where your open workload sits.</p>
            </div>
          </header>

          <div className="priority-mix">
            {priorityMix.map((priority) => (
              <div className="priority-mix-row" key={priority.key}>
                <div className="priority-mix-head">
                  <span className="priority-mix-label">
                    <span
                      className={`priority-dot priority-${priority.key}`}
                      aria-hidden="true"
                    />
                    {priority.label}
                  </span>
                  <span className="priority-mix-count">{priority.count}</span>
                </div>
                <div className="priority-mix-bar">
                  <span
                    className={`priority-mix-fill is-${priority.key}`}
                    style={{
                      width: `${Math.round((priority.count / priorityTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {openTasks.length === 0 ? (
            <p className="dash-panel-note">No open tasks to sort yet.</p>
          ) : (
            <p className="dash-panel-note">
              {openTasks.length} open task{openTasks.length === 1 ? "" : "s"} in
              total.
            </p>
          )}
        </section>
      </div>

      <section className="dash-momentum" aria-labelledby="dash-momentum-title">
        <span className="dash-momentum-icon" aria-hidden="true">
          <Target />
        </span>
        <div className="dash-momentum-copy">
          <h2 id="dash-momentum-title">
            {openTasks.length ? "Room to build momentum" : "A clean slate"}
          </h2>
          <p>
            {openTasks.length
              ? "Pick one high-priority task and schedule a focused block. Small wins compound quickly."
              : "Everything is wrapped up. Add the next thing you want to move forward."}
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => (openTasks.length ? onNavigate("focus") : onAddTask())}
          disabled={busy}
        >
          {openTasks.length ? (
            <TimerReset aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          <span>{openTasks.length ? "Start focus session" : "Create a task"}</span>
        </button>
      </section>
    </div>
  );
}
