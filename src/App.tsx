import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import type {
  AppState,
  AppView,
  BrandConfig,
  HistoryEntry,
  Priority,
  Task,
  TaskDraft,
  TaskFilter,
  TaskUpdate,
  Team,
  User,
} from "./types";
import { api, ApiError } from "./lib/api";
import { truncate } from "./lib/dates";
import {
  buildListSummary,
  getBaseTasks,
  getFilterCounts,
  getOverview,
  getViewTasks,
} from "./lib/tasks";
import { normalizeBrand, readableInk } from "./lib/brand";
import { defaultBrand } from "./config/brand";
import { defaultFilterFor, taskCategories, viewMeta } from "./config/views";
import { useTheme } from "./hooks/useTheme";
import { useToasts } from "./hooks/useToasts";
import { AuthScreen } from "./components/AuthScreen";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { QuickAdd } from "./components/QuickAdd";
import { DashboardView } from "./components/DashboardView";
import { BoardView } from "./components/BoardView";
import { CalendarView } from "./components/CalendarView";
import { FocusView } from "./components/FocusView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { TaskToolbar } from "./components/TaskToolbar";
import { TaskList } from "./components/TaskList";
import { EditTaskDialog } from "./components/EditTaskDialog";
import { TeamDialog } from "./components/TeamDialog";
import { BrandSettingsDialog } from "./components/BrandSettingsDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ServiceBanner } from "./components/ServiceBanner";
import { Toasts } from "./components/Toasts";

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

const EMPTY_STATE: AppState = { tasks: [], history: [] };
const LIST_VIEWS: AppView[] = [
  "tasks",
  "today",
  "upcoming",
  "completed",
  "important",
];
const COMPOSER_VIEWS: AppView[] = ["tasks", "today", "upcoming", "important"];

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function endOfToday(now: Date) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { toasts, pushToast, dismissToast } = useToasts();

  const [brand, setBrand] = useState<BrandConfig>(defaultBrand);
  const [user, setUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [state, setState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("taskflow.sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [focusSignal, setFocusSignal] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const resetWorkspace = useCallback(() => {
    setState(EMPTY_STATE);
    setTeams([]);
    setActiveTeamId(null);
    setTeamDialogOpen(false);
    setError(null);
    setEditingTaskId(null);
    setBrandOpen(false);
    setConfirm(null);
    setView("dashboard");
    setFilter("all");
    setSearch("");
    setCategoryFilter("all");
    setPriorityFilter("all");
    setSidebarOpen(false);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setLoading(false);
    resetWorkspace();
    pushToast("Your session ended. Please sign in again.", {
      type: "error",
      duration: 6000,
    });
  }, [pushToast, resetWorkspace]);

  const reportError = useCallback(
    (requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) {
        handleSessionExpired();
        return;
      }

      const message = errorMessage(requestError);
      pushToast(message, { type: "error", duration: 6500 });

      if (
        requestError instanceof ApiError &&
        (requestError.status === 0 || requestError.status >= 500)
      ) {
        setError(message);
      }
    },
    [handleSessionExpired, pushToast],
  );

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [brandResponse, teamsResponse] = await Promise.all([
        api.getBrand(),
        api.getTeams(),
      ]);

      if (brandResponse.brand) {
        setBrand(normalizeBrand(brandResponse.brand));
      }
      setTeams(teamsResponse.teams);

      const validTeamId =
        activeTeamId &&
        teamsResponse.teams.some((team) => team.id === activeTeamId)
          ? activeTeamId
          : null;

      if (validTeamId !== activeTeamId) {
        setActiveTeamId(validTeamId);
      }

      const nextState = await api.getState(validTeamId);
      setState(nextState);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        handleSessionExpired();
        return;
      }
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, handleSessionExpired, user]);

  const checkSession = useCallback(async () => {
    setSessionChecked(false);
    setBootError(null);

    try {
      const [session, brandResponse] = await Promise.all([
        api.getSession(),
        api.getBrand(),
      ]);
      if (brandResponse.brand) {
        setBrand(normalizeBrand(brandResponse.brand));
      }
      setUser(session.user);
    } catch (sessionError) {
      setBootError(errorMessage(sessionError));
      setLoading(false);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  const handleAuthenticated = useCallback(
    (nextUser: User) => {
      setBootError(null);
      setLoading(true);
      resetWorkspace();
      setUser(nextUser);
      pushToast(`Signed in as @${nextUser.username}.`, { duration: 2800 });
    },
    [pushToast, resetWorkspace],
  );

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // Signing out locally is still the right outcome.
    } finally {
      setLoggingOut(false);
    }

    setUser(null);
    setLoading(false);
    resetWorkspace();
    pushToast("Signed out.", { duration: 2400 });
  }, [loggingOut, pushToast, resetWorkspace]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "taskflow.sidebarCollapsed",
        sidebarCollapsed ? "1" : "0",
      );
    } catch {
      // Sidebar preference is optional.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", brand.accent);
    root.style.setProperty("--brand-ink", readableInk(brand.accent));
    document.title = `${brand.name} · To-do workspace`;

    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      "content",
      `${brand.name} — ${brand.description}`,
    );
  }, [brand]);

  const overview = useMemo(
    () => getOverview(state.tasks, now),
    [state.tasks, now],
  );
  const viewBase = useMemo(
    () => getBaseTasks(state.tasks, view, now),
    [state.tasks, view, now],
  );
  const preStatusTasks = useMemo(
    () =>
      getViewTasks(state.tasks, {
        view,
        filter: "all",
        search,
        category: categoryFilter,
        priority: priorityFilter,
        now,
      }),
    [state.tasks, view, search, categoryFilter, priorityFilter, now],
  );
  const counts = useMemo(
    () => getFilterCounts(preStatusTasks, now),
    [preStatusTasks, now],
  );
  const visibleTasks = useMemo(
    () =>
      getViewTasks(state.tasks, {
        view,
        filter,
        search,
        category: categoryFilter,
        priority: priorityFilter,
        now,
      }),
    [
      state.tasks,
      view,
      filter,
      search,
      categoryFilter,
      priorityFilter,
      now,
    ],
  );
  const boardTasks = useMemo(
    () =>
      getViewTasks(state.tasks, {
        view: "tasks",
        filter: "all",
        search,
        category: categoryFilter,
        priority: priorityFilter,
        now,
      }),
    [state.tasks, search, categoryFilter, priorityFilter, now],
  );
  const calendarTasks = useMemo(
    () => boardTasks.filter((task) => task.deadline !== null),
    [boardTasks],
  );
  const focusTasks = useMemo(
    () =>
      getViewTasks(state.tasks, {
        view: "focus",
        filter: "all",
        search,
        category: categoryFilter,
        priority: priorityFilter,
        now,
      }),
    [state.tasks, search, categoryFilter, priorityFilter, now],
  );

  const navCounts = useMemo<Partial<Record<AppView, number>>>(() => {
    const endToday = endOfToday(now);
    const openTasks = state.tasks.filter((task) => !task.completed);

    return {
      tasks: openTasks.length,
      today: openTasks.filter(
        (task) =>
          task.deadline && new Date(task.deadline).getTime() <= endToday,
      ).length,
      upcoming: openTasks.filter(
        (task) =>
          task.deadline && new Date(task.deadline).getTime() > endToday,
      ).length,
      completed: state.tasks.filter((task) => task.completed).length,
      important: openTasks.filter((task) => task.priority === "high").length,
      history: state.history.length,
    };
  }, [state.tasks, state.history.length, now]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set<string>([
          ...taskCategories,
          ...state.tasks.map((task) => task.category),
        ]),
      ).sort((first, second) => first.localeCompare(second)),
    [state.tasks],
  );
  const completedTotal = useMemo(
    () => state.tasks.filter((task) => task.completed).length,
    [state.tasks],
  );

  const summary = buildListSummary(
    visibleTasks.length,
    viewBase.length,
    viewBase.filter((task) => !task.completed).length,
    filter,
    search,
  );

  const editingTask =
    state.tasks.find((task) => task.id === editingTaskId) ?? null;
  const actionsDisabled = loading || busy || Boolean(error);
  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId],
  );
  const canClearHistory = activeTeamId === null || activeTeam?.role === "owner";
  const isListView = LIST_VIEWS.includes(view);
  const showComposer = COMPOSER_VIEWS.includes(view);
  const remaining = visibleTasks.filter((task) => !task.completed).length;

  const handleViewChange = useCallback((next: AppView) => {
    setView(next);
    setFilter(defaultFilterFor(next));
    setCategoryFilter("all");
    setPriorityFilter("all");
    setEditingTaskId(null);
    setSidebarOpen(false);

    if (next === "dashboard" || next === "history" || next === "settings") {
      setSearch("");
    }
  }, []);

  const handleSearchChange = useCallback(
    (next: string) => {
      setSearch(next);
      if (
        next.trim() &&
        (view === "dashboard" || view === "history" || view === "settings")
      ) {
        setView("tasks");
        setFilter("all");
      }
    },
    [view],
  );

  const focusQuickAdd = useCallback(() => {
    if (!COMPOSER_VIEWS.includes(view)) {
      setView("tasks");
      setFilter("all");
    }
    setFocusSignal((current) => current + 1);
  }, [view]);

  const focusSearch = useCallback(() => {
    setSidebarCollapsed(false);
    setSidebarOpen(true);
    if (!["tasks", "completed", "today", "upcoming", "important"].includes(view)) {
      setView("tasks");
      setFilter("all");
    }
    requestAnimationFrame(() => {
      document.getElementById("sidebar-search-input")?.focus();
    });
  }, [view]);

  const handleAdd = useCallback(
    async (draft: TaskDraft) => {
      if (busy) return false;
      setBusy(true);

      try {
        const nextState = await api.createTask({
          ...draft,
          teamId: activeTeamId,
        });
        setState(nextState);
        setError(null);
        setFilter("all");
        setSearch("");
        setCategoryFilter("all");
        setPriorityFilter("all");
        pushToast(
          activeTeamId
            ? `Shared task added to ${activeTeam?.name ?? "the team"}.`
            : "Personal task added.",
          { duration: 2600 },
        );
        return true;
      } catch (requestError) {
        reportError(requestError);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [activeTeam?.name, activeTeamId, busy, pushToast, reportError],
  );

  const handleToggle = useCallback(
    async (task: Task) => {
      if (busy) return;
      setBusy(true);

      try {
        const nextState = await api.updateTask(task.id, {
          completed: !task.completed,
        });
        setState(nextState);
        setError(null);
        pushToast(
          task.completed ? "Task moved back to active." : "Task completed.",
          { duration: 2400 },
        );
      } catch (requestError) {
        reportError(requestError);
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  const handleSelectTeam = useCallback(
    (teamId: string | null) => {
      if (teamId === activeTeamId) {
        setSidebarOpen(false);
        return;
      }

      setActiveTeamId(teamId);
      setState(EMPTY_STATE);
      setLoading(true);
      setFilter("all");
      setSearch("");
      setCategoryFilter("all");
      setPriorityFilter("all");
      setEditingTaskId(null);
      setConfirm(null);
      setSidebarOpen(false);
    },
    [activeTeamId],
  );

  const handleCreateTeam = useCallback(
    async (name: string) => {
      if (busy) return false;
      setBusy(true);

      try {
        const { team } = await api.createTeam(name);
        const { teams: nextTeams } = await api.getTeams();
        setTeams(nextTeams);
        setActiveTeamId(team.id);
        setState(EMPTY_STATE);
        setFilter("all");
        setSearch("");
        setCategoryFilter("all");
        setPriorityFilter("all");
        setError(null);
        pushToast(
          `Team “${team.name}” created. Invite code: ${team.inviteCode}.`,
          { duration: 8000 },
        );
        return true;
      } catch (requestError) {
        reportError(requestError);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  const handleJoinTeam = useCallback(
    async (inviteCode: string) => {
      if (busy) return false;
      setBusy(true);

      try {
        const { team } = await api.joinTeam(inviteCode);
        const { teams: nextTeams } = await api.getTeams();
        setTeams(nextTeams);
        setActiveTeamId(team.id);
        setState(EMPTY_STATE);
        setFilter("all");
        setSearch("");
        setCategoryFilter("all");
        setPriorityFilter("all");
        setError(null);
        pushToast(`Joined ${team.name}.`, { duration: 3000 });
        return true;
      } catch (requestError) {
        reportError(requestError);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  const restoreDeleted = useCallback(
    async (historyId: string) => {
      if (busy) return;
      setBusy(true);

      try {
        const nextState = await api.restoreHistory(historyId);
        setState(nextState);
        setError(null);
        pushToast("Task restored.", { duration: 2600 });
      } catch (requestError) {
        reportError(requestError);
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  const requestDelete = useCallback(
    (task: Task) => {
      setConfirm({
        title: "Delete this task?",
        message: `“${truncate(
          task.title,
          90,
        )}” will be removed from ${
          task.teamId ? "the team board" : "your list"
        }. A restorable record will stay in ${
          task.teamId ? "team" : "your"
        } history.`,
        confirmLabel: "Delete task",
        action: async () => {
          setBusy(true);
          try {
            const result = await api.deleteTask(task.id);
            setState(result.state);
            setError(null);
            pushToast(`Deleted “${truncate(task.title, 40)}”.`, {
              actionLabel: "Undo",
              duration: 7000,
              onAction: () => {
                void restoreDeleted(result.deletedHistoryId);
              },
            });
          } catch (requestError) {
            reportError(requestError);
          } finally {
            setBusy(false);
          }
        },
      });
    },
    [pushToast, reportError, restoreDeleted],
  );

  const requestClearCompleted = useCallback(() => {
    const completedCount = completedTotal;

    if (completedCount === 0) {
      pushToast("No completed tasks to clear in this workspace.", {
        duration: 3000,
      });
      return;
    }

    setConfirm({
      title: activeTeamId
        ? "Clear completed team tasks?"
        : "Clear completed tasks?",
      message: `This permanently removes ${completedCount} completed task${
        completedCount === 1 ? "" : "s"
      } from ${
        activeTeamId ? "the team board" : "your list"
      }. History entries are kept.`,
      confirmLabel: "Clear completed",
      action: async () => {
        setBusy(true);
        try {
          const result = await api.clearCompleted(activeTeamId);
          setState(result.state);
          setError(null);
          pushToast(
            result.cleared
              ? `Cleared ${result.cleared} completed task${
                  result.cleared === 1 ? "" : "s"
                }.`
              : "Nothing was cleared.",
            { duration: 3200 },
          );
        } catch (requestError) {
          reportError(requestError);
        } finally {
          setBusy(false);
        }
      },
    });
  }, [activeTeamId, completedTotal, pushToast, reportError]);

  const requestClearHistory = useCallback(() => {
    const count = state.history.length;
    if (count === 0) return;

    if (activeTeamId && activeTeam?.role !== "owner") {
      pushToast("Only the team owner can clear team activity.", {
        type: "error",
        duration: 4000,
      });
      return;
    }

    setConfirm({
      title: activeTeamId ? "Clear team history?" : "Clear your history?",
      message: `This removes all ${count} ${
        activeTeamId ? "team " : ""
      }history entr${count === 1 ? "y" : "ies"}. Current tasks will not be affected.`,
      confirmLabel: "Clear history",
      action: async () => {
        setBusy(true);
        try {
          const nextState = await api.clearHistory(activeTeamId);
          setState(nextState);
          setError(null);
          pushToast(activeTeamId ? "Team history cleared." : "History cleared.", {
            duration: 2600,
          });
        } catch (requestError) {
          reportError(requestError);
        } finally {
          setBusy(false);
        }
      },
    });
  }, [
    activeTeam?.role,
    activeTeamId,
    pushToast,
    reportError,
    state.history.length,
  ]);

  const handleSaveTask = useCallback(
    async (id: string, updates: TaskUpdate) => {
      if (busy) return false;
      setBusy(true);

      try {
        const nextState = await api.updateTask(id, updates);
        setState(nextState);
        setError(null);
        pushToast("Changes saved.", { duration: 2400 });
        return true;
      } catch (requestError) {
        reportError(requestError);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  const handleSaveBrand = useCallback(
    async (nextBrand: BrandConfig) => {
      if (busy) return false;
      setBusy(true);

      try {
        const saved = await api.saveBrand(nextBrand);
        setBrand(normalizeBrand(saved.brand));
        setError(null);
        pushToast("Brand settings saved.", { duration: 3000 });
        return true;
      } catch (requestError) {
        reportError(requestError);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, pushToast, reportError],
  );

  async function handleConfirm() {
    if (!confirm) return;

    setConfirmBusy(true);
    try {
      await confirm.action();
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  }

  function resetView() {
    setFilter(defaultFilterFor(view));
    setCategoryFilter("all");
    setPriorityFilter("all");
    setSearch("");
  }

  function handleRestoreEntry(entry: HistoryEntry) {
    void restoreDeleted(entry.id);
  }

  if (!sessionChecked) {
    return (
      <div className="boot-shell" role="status" aria-live="polite">
        <span className="brand-mark boot-mark" aria-hidden="true">
          {brand.logoText}
        </span>
        <p className="boot-message">Opening {brand.name}…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <>
        <div className="boot-shell">
          <div className="boot-card">
            <span className="brand-mark boot-mark" aria-hidden="true">
              {brand.logoText}
            </span>
            <h1>Can’t reach {brand.name}</h1>
            <p>{bootError}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void checkSession()}
            >
              Try again
            </button>
          </div>
        </div>
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          brand={brand}
          theme={theme}
          onToggleTheme={toggleTheme}
          onAuthenticated={handleAuthenticated}
        />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const meta = viewMeta[view];
  const workspaceLabel = activeTeam
    ? `${activeTeam.name} · team workspace`
    : "Personal workspace";

  return (
    <>
      <div
        className={`app-shell${sidebarOpen ? " sidebar-open" : ""}${
          sidebarCollapsed ? " sidebar-collapsed" : ""
        }`}
      >
        <Sidebar
          brand={brand}
          user={user}
          view={view}
          teams={teams}
          activeTeamId={activeTeamId}
          counts={navCounts}
          search={search}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCollapse={() => setSidebarCollapsed(true)}
          onViewChange={handleViewChange}
          onSearchChange={handleSearchChange}
          onSelectTeam={handleSelectTeam}
          onManageTeams={() => setTeamDialogOpen(true)}
          onLogout={() => void handleLogout()}
        />

        {sidebarCollapsed ? (
          <div className="sidebar-reveal-zone">
            <button
              className="sidebar-reveal"
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <PanelLeftOpen aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {sidebarOpen ? (
          <button
            className="sidebar-scrim"
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="app-main">
          <Topbar
            title={meta.title}
            subtitle={meta.subtitle}
            workspaceLabel={workspaceLabel}
            theme={theme}
            disabled={actionsDisabled}
            onMenu={() => setSidebarOpen(true)}
            onSearch={focusSearch}
            onToggleTheme={toggleTheme}
            onOpenBrand={() => setBrandOpen(true)}
            onAddTask={focusQuickAdd}
          />

          {error && !loading ? (
            <ServiceBanner
              message={error}
              busy={loading}
              onRetry={() => void load()}
            />
          ) : null}

          <main className="app-content">
            {view === "dashboard" ? (
              <DashboardView
                tasks={state.tasks}
                history={state.history}
                now={now}
                overview={overview}
                team={activeTeam}
                currentUserId={user.id}
                teamRole={activeTeam?.role ?? null}
                username={user.username}
                busy={actionsDisabled}
                onEdit={(task) => setEditingTaskId(task.id)}
                onAddTask={focusQuickAdd}
                onNavigate={handleViewChange}
              />
            ) : null}

            {isListView ? (
              <div className="list-view">
                {showComposer ? (
                  <QuickAdd
                    disabled={actionsDisabled}
                    scopeKind={activeTeam ? "team" : "personal"}
                    scopeLabel={activeTeam?.name ?? "Personal"}
                    focusSignal={focusSignal}
                    onAdd={handleAdd}
                  />
                ) : null}

                <section className="panel list-panel" aria-label={meta.title}>
                  <TaskToolbar
                    filter={filter}
                    counts={counts}
                    category={categoryFilter}
                    categories={categories}
                    priority={priorityFilter}
                    showStatusTabs
                    remaining={remaining}
                    clearDisabled={actionsDisabled || completedTotal === 0}
                    onFilterChange={setFilter}
                    onCategoryChange={setCategoryFilter}
                    onPriorityChange={setPriorityFilter}
                    onAddTask={focusQuickAdd}
                    onClearCompleted={requestClearCompleted}
                  />

                  <TaskList
                    tasks={visibleTasks}
                    totalCount={viewBase.length}
                    filter={filter}
                    search={search}
                    summary={summary}
                    loading={loading}
                    disabled={actionsDisabled}
                    currentUserId={user.id}
                    teamName={activeTeam?.name ?? null}
                    teamRole={activeTeam?.role ?? null}
                    onToggle={handleToggle}
                    onEdit={(task) => setEditingTaskId(task.id)}
                    onDelete={requestDelete}
                    onResetView={resetView}
                    onAddTask={focusQuickAdd}
                  />
                </section>
              </div>
            ) : null}

            {view === "board" ? (
              <BoardView
                tasks={boardTasks}
                currentUserId={user.id}
                teamRole={activeTeam?.role ?? null}
                teamName={activeTeam?.name ?? null}
                busy={actionsDisabled}
                onToggle={handleToggle}
                onEdit={(task) => setEditingTaskId(task.id)}
                onDelete={requestDelete}
                onAddTask={focusQuickAdd}
              />
            ) : null}

            {view === "calendar" ? (
              <CalendarView
                tasks={calendarTasks}
                currentUserId={user.id}
                teamRole={activeTeam?.role ?? null}
                busy={actionsDisabled}
                onToggle={handleToggle}
                onEdit={(task) => setEditingTaskId(task.id)}
                onDelete={requestDelete}
                onAddTask={focusQuickAdd}
              />
            ) : null}

            {view === "focus" ? (
              <FocusView
                tasks={focusTasks}
                currentUserId={user.id}
                teamRole={activeTeam?.role ?? null}
                busy={actionsDisabled}
                onToggle={handleToggle}
                onEdit={(task) => setEditingTaskId(task.id)}
                onAddTask={focusQuickAdd}
              />
            ) : null}

            {view === "history" ? (
              <HistoryView
                history={state.history}
                busy={actionsDisabled}
                teamName={activeTeam?.name ?? null}
                canClear={canClearHistory}
                onClear={requestClearHistory}
                onRestore={handleRestoreEntry}
              />
            ) : null}

            {view === "settings" ? (
              <SettingsView
                user={user}
                brand={brand}
                theme={theme}
                teams={teams}
                activeTeamId={activeTeamId}
                activeTeam={activeTeam}
                overview={overview}
                historyCount={state.history.length}
                busy={actionsDisabled}
                onToggleTheme={toggleTheme}
                onOpenBrand={() => setBrandOpen(true)}
                onManageTeams={() => setTeamDialogOpen(true)}
                onSelectTeam={handleSelectTeam}
                onLogout={() => void handleLogout()}
              />
            ) : null}
          </main>

          <footer className="app-footer">
            <p>
              {brand.name} keeps your data on this computer in a local SQLite
              database.
            </p>
            <p>React + Vite · local-first</p>
          </footer>
        </div>
      </div>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <EditTaskDialog
        task={editingTask}
        onClose={() => setEditingTaskId(null)}
        onSave={handleSaveTask}
      />

      <TeamDialog
        open={teamDialogOpen}
        teams={teams}
        activeTeamId={activeTeamId}
        onClose={() => setTeamDialogOpen(false)}
        onSelect={handleSelectTeam}
        onCreate={handleCreateTeam}
        onJoin={handleJoinTeam}
      />

      <BrandSettingsDialog
        open={brandOpen}
        brand={brand}
        onClose={() => setBrandOpen(false)}
        onSave={handleSaveBrand}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
