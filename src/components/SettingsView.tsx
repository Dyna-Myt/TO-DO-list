import {
  Database,
  LogOut,
  Moon,
  Palette,
  Plus,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import type { BrandConfig, Team, User } from "../types";
import type { Theme } from "../hooks/useTheme";
import type { TaskOverview } from "../lib/tasks";
import { formatFullDate } from "../lib/dates";

interface SettingsViewProps {
  user: User;
  brand: BrandConfig;
  theme: Theme;
  teams: Team[];
  activeTeamId: string | null;
  activeTeam: Team | null;
  overview: TaskOverview;
  historyCount: number;
  busy: boolean;
  onToggleTheme: () => void;
  onOpenBrand: () => void;
  onManageTeams: () => void;
  onSelectTeam: (teamId: string | null) => void;
  onLogout: () => void;
}

export function SettingsView({
  user,
  brand,
  theme,
  teams,
  activeTeamId,
  activeTeam,
  overview,
  historyCount,
  busy,
  onToggleTheme,
  onOpenBrand,
  onManageTeams,
  onSelectTeam,
  onLogout,
}: SettingsViewProps) {
  return (
    <div className="settings-view">
      <section className="settings-card panel" aria-labelledby="settings-account">
        <header className="panel-head">
          <div>
            <p className="section-kicker">Account</p>
            <h2 id="settings-account">Signed in</h2>
          </div>
          <span className="stat-icon stat-icon-sage" aria-hidden="true">
            <UserRound />
          </span>
        </header>
        <dl className="settings-list">
          <div>
            <dt>Username</dt>
            <dd>@{user.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{formatFullDate(user.createdAt)}</dd>
          </div>
        </dl>
        <button
          className="secondary-button"
          type="button"
          onClick={onLogout}
          disabled={busy}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </section>

      <section className="settings-card panel" aria-labelledby="settings-workspace">
        <header className="panel-head">
          <div>
            <p className="section-kicker">Workspace</p>
            <h2 id="settings-workspace">
              {activeTeam ? activeTeam.name : "Personal"}
            </h2>
          </div>
          <span className="stat-icon stat-icon-red" aria-hidden="true">
            {activeTeam ? <Users /> : <ShieldCheck />}
          </span>
        </header>

        <p className="settings-note">
          {activeTeam
            ? `Shared with ${activeTeam.members.length} member${
                activeTeam.members.length === 1 ? "" : "s"
              }. Invite code: ${activeTeam.inviteCode}.`
            : "Personal tasks are private to you and never appear on a team board."}
        </p>

        <div className="settings-teams">
          <button
            className={`settings-team${activeTeamId === null ? " is-active" : ""}`}
            type="button"
            onClick={() => onSelectTeam(null)}
          >
            <span className="settings-team-copy">
              <strong>Personal</strong>
              <small>Private workspace</small>
            </span>
            {activeTeamId === null ? <span className="dot-pill">Active</span> : null}
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              className={`settings-team${
                activeTeamId === team.id ? " is-active" : ""
              }`}
              type="button"
              onClick={() => onSelectTeam(team.id)}
            >
              <span className="settings-team-copy">
                <strong>{team.name}</strong>
                <small>
                  {team.members.length} member
                  {team.members.length === 1 ? "" : "s"}
                </small>
              </span>
              {activeTeamId === team.id ? (
                <span className="dot-pill">Active</span>
              ) : null}
            </button>
          ))}
        </div>

        <button className="secondary-button" type="button" onClick={onManageTeams}>
          <Plus aria-hidden="true" />
          Manage teams
        </button>
      </section>

      <section className="settings-card panel" aria-labelledby="settings-appearance">
        <header className="panel-head">
          <div>
            <p className="section-kicker">Appearance</p>
            <h2 id="settings-appearance">Make it yours</h2>
          </div>
          <span className="stat-icon stat-icon-sage" aria-hidden="true">
            <Palette />
          </span>
        </header>

        <div className="settings-row">
          <div>
            <strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong>
            <small>Switch between the light and dark palette.</small>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
            {theme === "dark" ? "Use light" : "Use dark"}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <strong>Brand colors</strong>
            <small>
              {brand.name} is using {brand.accent}. Customize the accent, name,
              and tagline.
            </small>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenBrand}
          >
            <Palette aria-hidden="true" />
            Customize
          </button>
        </div>
      </section>

      <section className="settings-card panel" aria-labelledby="settings-data">
        <header className="panel-head">
          <div>
            <p className="section-kicker">Data</p>
            <h2 id="settings-data">Stored on this computer</h2>
          </div>
          <span className="stat-icon stat-icon-amber" aria-hidden="true">
            <Database />
          </span>
        </header>

        <div className="settings-stats">
          <div>
            <strong>{overview.total}</strong>
            <small>Total tasks</small>
          </div>
          <div>
            <strong>{overview.percentage}%</strong>
            <small>Complete</small>
          </div>
          <div>
            <strong>{historyCount}</strong>
            <small>History entries</small>
          </div>
        </div>

        <p className="settings-note">
          {brand.name} keeps accounts, tasks, teams, and history in a local
          SQLite database. Nothing leaves this computer unless you share a team
          invite code.
        </p>
      </section>
    </div>
  );
}
