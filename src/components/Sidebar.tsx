import {
  CalendarDays,
  CheckCircle2,
  Columns3,
  History,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Timer,
  Users,
  X,
} from "lucide-react";
import type { AppView, BrandConfig, Team, User } from "../types";

interface SidebarProps {
  brand: BrandConfig;
  user: User;
  view: AppView;
  teams: Team[];
  activeTeamId: string | null;
  counts: Partial<Record<AppView, number>>;
  search: string;
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
  onViewChange: (view: AppView) => void;
  onSearchChange: (search: string) => void;
  onSelectTeam: (teamId: string | null) => void;
  onManageTeams: () => void;
  onLogout: () => void;
}

const menuItems: Array<{ view: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "tasks", label: "My Tasks", icon: ListChecks },
  { view: "completed", label: "Completed", icon: CheckCircle2 },
];

const workspaceItems: Array<{
  view: AppView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { view: "board", label: "Board", icon: Columns3 },
  { view: "calendar", label: "Calendar", icon: CalendarDays },
  { view: "focus", label: "Focus", icon: Timer },
  { view: "history", label: "History", icon: History },
  { view: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  brand,
  user,
  view,
  teams,
  activeTeamId,
  counts,
  search,
  open,
  onClose,
  onCollapse,
  onViewChange,
  onSearchChange,
  onSelectTeam,
  onManageTeams,
  onLogout,
}: SidebarProps) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <aside className={`sidebar${open ? " is-open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          {brand.logoText}
        </span>
        <div className="sidebar-brand-copy">
          <span className="sidebar-brand-name">{brand.name}</span>
          <span className="sidebar-brand-tag">My To-Do</span>
        </div>
        <button
          className="icon-button sidebar-collapse"
          type="button"
          onClick={onCollapse}
          aria-label="Hide sidebar"
          title="Hide sidebar"
        >
          <PanelLeftClose aria-hidden="true" />
        </button>
        <button
          className="icon-button sidebar-close"
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <label className="sidebar-search">
        <Search aria-hidden="true" />
        <span className="sr-only">Search tasks and categories</span>
        <input
          id="sidebar-search-input"
          type="search"
          placeholder="Search tasks, categories..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <nav className="sidebar-nav">
        <p className="sidebar-label">Menu</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const count = counts[item.view] ?? 0;
          return (
            <button
              key={item.view}
              className={`nav-item${view === item.view ? " is-active" : ""}`}
              type="button"
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => onViewChange(item.view)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
              {count > 0 ? <span className="nav-badge">{count}</span> : null}
            </button>
          );
        })}

        <p className="sidebar-label">Workspace</p>
        {workspaceItems.map((item) => {
          const Icon = item.icon;
          const count = counts[item.view] ?? 0;
          return (
            <button
              key={item.view}
              className={`nav-item${view === item.view ? " is-active" : ""}`}
              type="button"
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => onViewChange(item.view)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
              {count > 0 ? <span className="nav-badge">{count}</span> : null}
            </button>
          );
        })}

        <p className="sidebar-label">Teams</p>
        <button
          className={`team-switch${activeTeamId === null ? " is-active" : ""}`}
          type="button"
          onClick={() => onSelectTeam(null)}
        >
          <LockKeyhole aria-hidden="true" />
          <span className="team-switch-copy">
            <strong>Personal</strong>
            <small>Private workspace</small>
          </span>
        </button>

        {teams.map((team) => (
          <button
            key={team.id}
            className={`team-switch${activeTeamId === team.id ? " is-active" : ""}`}
            type="button"
            onClick={() => onSelectTeam(team.id)}
          >
            <Users aria-hidden="true" />
            <span className="team-switch-copy">
              <strong>{team.name}</strong>
              <small>
                {team.members.length} member{team.members.length === 1 ? "" : "s"}
              </small>
            </span>
          </button>
        ))}

        {teams.length === 0 ? (
          <p className="sidebar-empty">No teams yet. Create one to share tasks.</p>
        ) : null}

        <button className="sidebar-create" type="button" onClick={onManageTeams}>
          <Plus aria-hidden="true" />
          <span>Create team</span>
        </button>
      </nav>

      <div className="sidebar-user">
        <span className="sidebar-avatar" aria-hidden="true">
          {initials}
        </span>
        <div className="sidebar-user-copy">
          <strong>@{user.username}</strong>
          <span>{user.email}</span>
          <small>{activeTeam ? `${activeTeam.name} workspace` : "Personal workspace"}</small>
        </div>
        <button
          className="icon-button sidebar-logout"
          type="button"
          onClick={onLogout}
          aria-label={`Sign out ${user.username}`}
          title="Sign out"
        >
          <LogOut aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
