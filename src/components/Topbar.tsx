import { Menu, Moon, Palette, Plus, Search, Sun } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface TopbarProps {
  title: string;
  subtitle: string;
  workspaceLabel: string;
  theme: Theme;
  disabled: boolean;
  onMenu: () => void;
  onSearch: () => void;
  onToggleTheme: () => void;
  onOpenBrand: () => void;
  onAddTask: () => void;
}

export function Topbar({
  title,
  subtitle,
  workspaceLabel,
  theme,
  disabled,
  onMenu,
  onSearch,
  onToggleTheme,
  onOpenBrand,
  onAddTask,
}: TopbarProps) {
  return (
    <header className="app-topbar">
      <button
        className="icon-button topbar-menu"
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </button>

      <div className="topbar-copy">
        <p className="topbar-kicker">{workspaceLabel}</p>
        <h1>{title}</h1>
        <p className="topbar-sub">{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Search tasks"
          title="Search tasks"
          onClick={onSearch}
        >
          <Search aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Customize brand"
          title="Customize brand"
          onClick={onOpenBrand}
        >
          <Palette aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </button>
        <button
          className="primary-button topbar-add"
          type="button"
          onClick={onAddTask}
          disabled={disabled}
        >
          <Plus aria-hidden="true" />
          <span>New task</span>
        </button>
      </div>
    </header>
  );
}
