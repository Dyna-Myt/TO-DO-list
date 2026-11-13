# Taskflow (React)

A local-first task workspace built with **React + TypeScript + Vite**, backed by a small **Express + SQLite** service. The interface is a sidebar-driven workspace in charcoal, sand, and electric blue, with a dashboard, list views, a progress board, a calendar, a focus timer, history, and settings — plus email/password accounts, private personal tasks, shared team workspaces, and white-label branding.

## Features

### Layout and navigation

- Persistent left sidebar with search, menu shortcuts, workspaces, teams, and your account
- Menu views: **Dashboard**, **My Tasks**, **Completed**
- Workspace views: **Board**, **Calendar**, **Focus**, **Settings**, plus **History**
- Collapsible sidebar on desktop: hide it with the panel button and a small tab slides in when you hover the left edge
- Status tabs on list views: **All**, **Pending**, **Overdue**, **Done**
- Category and priority filters, with a live “tasks left” count
- Responsive layout: the sidebar becomes a slide-over drawer on smaller screens
- Charcoal theme by default, with a sand-paper light theme

### Tasks

- Quick-add composer with title, deadline, optional time, category, and priority
- Smart add suggestions that run entirely in the browser: they spot dates (today, tomorrow, next week), priorities (urgent, someday), and categories (home chores like dusting and laundry, errands, code, design, meetings, and more) while you type, and never send task text anywhere
- **Deadline check** in the quick-add composer and edit dialog: it compares your plan with how long similar tasks actually took, flags the risk, and offers a realistic deadline in one click
- Preset categories plus any custom category already used in the workspace
- Optional deadlines with live overdue / today / upcoming labels
- Priority levels (high, medium, low) and free-form notes
- Edit, complete, reopen, and delete tasks
- **Clear completed** removes finished tasks in the active workspace while keeping history
- Search across task titles, notes, categories, and team owners

### Views

- **Dashboard** — time-aware greeting and momentum summary, open/completed/overdue/due-this-week stats, 7-day completion rhythm, overall progress, upcoming deadlines, priority mix, and a momentum banner
- **My Tasks / Today / Upcoming / Completed / Important** — filtered lists with the shared toolbar
- **Board** — three columns: **Pending** (0%), **In progress** (1–99%), **Done** (complete or 100%)
- **Calendar** — month grid of deadlines, with a selected-day task panel
- **Focus** — 15/25/45-minute timer ring for one task, with a focus queue and one-click completion
- **History** — completed, reopened, and deleted activity, with restore for deleted tasks
- **Settings** — account details, workspace and team switching, theme, brand colors, and local data stats

### Accounts and workspaces

- Email/password accounts with a unique username and a private personal task list
- Sign in with either your email or your username
- Passwords hashed with scrypt; opaque session tokens stored in SQLite
- Separate **Personal** and **Team** workspaces, switchable from the sidebar or Settings
- Create a team, share its 8-character invite code, and join from another account
- Team tasks are visible to every member, with the owner shown on each task
- Per-task completion percentage (0–100%), visible to the whole team
- Task creator or team owner can edit a team task; other members monitor it read-only
- Persistent activity history, with actor usernames in team history
- Restore a deleted task from history, or undo right after deleting
- Team history is visible to the team; only the team owner can clear it

### Data and branding

- White-label settings for app name, logo text, accent color, tagline, and description
- Data stored in a local SQLite database file, not in the browser

## Requirements

- Node.js **22.5+** (this project was built and tested on Node 26)
- npm

The backend uses Node's built-in `node:sqlite` module, so there are no native SQLite dependencies to compile.

## Getting started

```bash
cd taskflow-react
npm install
npm run dev
```

Open **http://127.0.0.1:5173** (or `http://localhost:5173`), then create an account on the sign-in screen. Pick a username, which is how teammates will recognise you on shared tasks. Every account gets its own private personal tasks and history. The first account created on an existing database also claims tasks that were saved before accounts were added.

Use the **Teams** section in the sidebar, or **Settings → Workspace**, to switch between **Personal** and any teams you belong to. Open **Create team** to start a team or enter an invite code. New tasks are added to whichever workspace is active, and the quick-add composer always shows whether the task is personal or shared.

`npm run dev` starts both processes:

- Vite dev server on port `5173`
- Local API on port `3001` (Vite proxies `/api` to it)

## Production

```bash
npm run build
npm start
```

The API server also serves the built frontend at **http://127.0.0.1:3001**.

In production the server binds to `0.0.0.0` so a hosting platform can reach it. Set `HOST` to override the bind address, and `PORT` if the platform assigns a port.

## Deploy

Taskflow needs a Node process and a persistent disk for the SQLite database, so static hosts such as GitHub Pages, Netlify, and Vercel are not a fit. The repo includes a `Dockerfile` and a `railway.json` for container-based hosts.

### Railway (recommended)

1. Create a project at [railway.com](https://railway.com) and choose **Deploy from GitHub repo**.
2. Select `Dyna-Myt/TO-DO-list`. Railway detects the `Dockerfile` automatically.
3. Add a **Volume** mounted at `/data`.
4. Add these variables under **Variables**:
   - `TASKFLOW_DB=/data/taskflow.db`
   - `NODE_ENV=production`
5. Deploy. Railway provides a public `https://…up.railway.app` URL.

### Render

1. Create a **Web Service** from the GitHub repo.
2. Choose the **Docker** runtime (uses the included `Dockerfile`), or the Node runtime with build `npm install && npm run build` and start `npm start`.
3. Add a persistent disk mounted at `/data`. Persistent disks require a paid instance type.
4. Set `TASKFLOW_DB=/data/taskflow.db`.
5. Deploy and use the generated `https://…onrender.com` URL.

The hosted database starts empty. The local `data/` directory (including your current tasks, backups, and reference CSV) is git-ignored and is never uploaded.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the API and Vite dev server together |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm start` | Serve the production build and API on port `3001` |
| `npm run preview` | Preview the Vite build only |
| `npm run typecheck` | Run TypeScript without emitting files |

## Views and filters

| View | What it shows |
| --- | --- |
| Dashboard | Greeting and stats, completion rhythm, overall progress, upcoming deadlines, priority mix, and a momentum banner |
| My Tasks | Every task in the active workspace |
| Today | Tasks due today plus anything overdue |
| Upcoming | Tasks with a future deadline |
| Completed | Finished tasks, with **Clear completed** |
| Important | High-priority open tasks |
| Board | Pending / In progress / Done columns based on progress |
| Calendar | Deadlines on a month grid, plus a selected-day panel |
| Focus | A single task with a timer ring and a focus queue |
| History | Completed, reopened, and deleted activity, with restore |
| Settings | Account, workspace, appearance, brand, and local data |

List views share status tabs (**All**, **Pending**, **Overdue**, **Done**) and the **All categories** / **Any priority** filters. Search lives in the sidebar and jumps to **My Tasks** when you start typing from a non-list view.

## Personal and team workspaces

- **Personal tasks** have no team. Only the signed-in account can see or change them.
- **Team tasks** belong to a team. Every member of that team can see the task, its owner, its deadline, its notes, its category, and its progress percentage.
- A task's creator can edit, complete, or delete it. The team owner can also manage any task on that team. Other members see a **View only** label.
- Setting progress to **100%** marks the task complete. Marking a task complete sets progress to 100%; reopening it sets progress back to 0%.
- Team activity history records who completed, reopened, or deleted a task. Deleted team tasks can be restored by their creator or the team owner.

## Deadline check (task recommender)

Taskflow includes a dependency-free JavaScript port of the original Python
`TaskRecommender` (`server/recommender.mjs`). It learns how long each kind of
task actually takes and answers the question: *is this deadline realistic?*

It is trained from two sources:

1. `data/reference/household_tasks.csv` — 1,786 historical household tasks
   (`T01`–`T20`) that ship with the app, so the feature works on a fresh
   database.
2. Your own completed tasks (personal and team) — completions are merged into
   the matching task type automatically.

Open **My Tasks** (or Today / Upcoming / Completed / Important) and start typing
a task name. The **Deadline check** card appears under the composer and shows:

- **risk** — `likely feasible`, `tight`, or `unlikely`
- **typical / safe / very safe** durations (p50, p80, p90 of actual days)
- the historical **on-time probability** for your planned number of days
- a suggested deadline with a one-click **Use …** button
- a short explanation citing the sample size and on-time rate

The same card appears in the **Edit task** dialog. Dates are returned as
`YYYY-MM-DD` by the HTTP API; the module itself can also format `DD-MM-YYYY`
to match the original Python contract.

Call the API directly:

```bash
curl -X POST http://127.0.0.1:3001/api/recommender/recommend \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"taskName":"Organise the wardrobe","plannedDays":4,"addedDate":"2026-11-13"}'
```

```json
{
  "recommendation": {
    "task_id": "T10",
    "task": "Organise the wardrobe",
    "matched_by": "exact_name",
    "planned_days": 4,
    "feasible": false,
    "risk": "unlikely",
    "on_time_probability": 0.081,
    "suggested_days_typical": 8,
    "suggested_days_safe": 10,
    "suggested_days_very_safe": 11,
    "suggested_deadline_typical": "2026-11-21",
    "suggested_deadline_safe": "2026-11-23",
    "suggested_deadline_very_safe": "2026-11-24",
    "confidence": "medium",
    "reason": "Based on 39 past \"Organise the wardrobe\" tasks: typical 8d, safe (p80) 10d, very safe (p90) 11d. …"
  }
}
```

The engine groups history by `task_id` (or normalized task name), computes
counts, averages, and p50/p75/p80/p90 percentiles, then compares your planned
days against p50 and p80. On-time probability is the empirical share of past
completions that finished within the plan. Confidence is `high` at 80+ samples,
`medium` at 30+, and `low` below that. Everything runs locally; task text only
travels to your own API.

## White-label configuration

Open the palette button in the top bar (or **Settings → Appearance**), or edit the defaults in `src/config/brand.ts`:

```ts
export const defaultBrand: BrandConfig = {
  name: "Taskflow",
  logoText: "✓",
  accent: "#2d56d2",
  tagline: "Make room for what matters.",
  description:
    "A calm workspace for your tasks, deadlines, and everything you've already crossed off.",
};
```

Brand settings saved from the app are stored in the `settings` table of the SQLite database. They apply to every browser that uses the same local server. The accent color drives buttons, focus rings, highlights, and the brand mark, and the app automatically picks readable text for the chosen color. The default palette is deep charcoal (`#0f100b`) and sand (`#cbc5ad`) with electric blue (`#2d56d2`) accents.

The in-app dialog also includes:

- 8 accent presets (electric blue, deep blue, periwinkle, sand, bronze, terracotta, amber, slate)
- A custom color picker
- **Reset to defaults**

## Data storage

By default the database lives at:

```
taskflow-react/data/taskflow.db
```

Override it with the `TASKFLOW_DB` environment variable:

```bash
TASKFLOW_DB=C:\path\to\my-tasks.db npm start
```

The database uses WAL mode and contains seven tables:

- `users` — username, email, scrypt password hash, and creation time
- `sessions` — opaque session tokens with expiry dates
- `teams` — team name, invite code, owner, and creation time
- `team_members` — membership and role (`owner` or `member`) per user and team
- `tasks` — current tasks, owned through `user_id`, optionally shared through `team_id`, with a `category` and a `progress` value from 0 to 100
- `history` — completed, reopened, and deleted activity, scoped to a user or team
- `settings` — white-label brand settings

Personal tasks have `team_id = NULL` and are only returned for their owner. Team tasks are returned only to members of that team. Branding remains instance-wide. Theme preference stays in `localStorage` because it is per-browser.

Existing databases are migrated automatically when the server starts:

- `users.username` is added, and existing accounts get a username based on their email address
- `tasks.team_id` and `tasks.progress` are added
- `tasks.category` is added and existing tasks default to `General`
- `history.team_id` is added
- The first account created on a pre-account database claims any unowned tasks and history rows

Back up `data/taskflow.db` (and its `-wal` / `-shm` files if present) before upgrading. The server applies migrations on startup.

## Authentication

- `POST /api/auth/register` — create an account with a username, email, and password of at least 8 characters
- `POST /api/auth/login` — sign in with an email **or** username and receive a 30-day session
- `POST /api/auth/logout` — revoke the current session
- `GET /api/auth/me` — return the signed-in user, or `null`

Usernames are unique case-insensitively, must be 3–24 characters, and may contain letters, numbers, dots, dashes, and underscores. Passwords are hashed with Node's `scrypt` and a random per-user salt. Session tokens are random 32-byte values stored in the `sessions` table and sent to the browser in an `HttpOnly`, `SameSite=Lax` cookie, so page scripts cannot read the token. The cookie is not marked `Secure` because this app is served over plain HTTP on `127.0.0.1`.

## API

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/brand` | Public | Read brand settings for the auth screen |
| `POST` | `/api/auth/register` | Public | Create an account |
| `POST` | `/api/auth/login` | Public | Sign in with email or username |
| `POST` | `/api/auth/logout` | Public | Sign out and clear the session cookie |
| `GET` | `/api/auth/me` | Public | Read the current session user |
| `GET` | `/api/teams` | Required | List the signed-in user's teams and members |
| `POST` | `/api/teams` | Required | Create a team |
| `POST` | `/api/teams/join` | Required | Join a team with an invite code |
| `GET` | `/api/state` | Required | The signed-in user's personal tasks and history |
| `GET` | `/api/state?teamId=…` | Required | Tasks and history for a team the user belongs to |
| `POST` | `/api/recommender/recommend` | Required | Deadline risk, suggested durations and dates for a task name/id |
| `POST` | `/api/tasks` | Required | Create a personal task, or a team task with `teamId`; accepts `category` |
| `PATCH` | `/api/tasks/:id` | Required | Update details, `category`, completion, or `progress` |
| `DELETE` | `/api/tasks/completed` | Required | Clear completed tasks in the personal workspace |
| `DELETE` | `/api/tasks/completed?teamId=…` | Required | Clear completed tasks on a team board |
| `DELETE` | `/api/tasks/:id` | Required | Delete a task and keep a restorable snapshot |
| `POST` | `/api/history/:id/restore` | Required | Restore a deleted task |
| `DELETE` | `/api/history?teamId=…` | Required | Clear personal or team history (team: owner only) |
| `PUT` | `/api/brand` | Required | Save brand settings |

Protected routes return `401` when there is no valid session, `403` when the account lacks permission, and `404` when a task or team is not visible to that account. The server binds to `127.0.0.1`, so it is only reachable from this computer.

Task fields accepted by the API:

- `title` — required, trimmed to 140 characters
- `notes` — optional, trimmed to 500 characters
- `category` — optional, trimmed to 40 characters, defaults to `General`
- `deadline` — optional ISO date string, or `null`
- `priority` — `high`, `medium`, or `low`
- `progress` — integer from 0 to 100
- `teamId` — omit or `null` for personal tasks

## Project structure

```
taskflow-react/
├─ server/
│  ├─ auth.mjs        # scrypt password hashing and verification
│  ├─ db.mjs          # SQLite schema, queries, migrations, and mutations
│  ├─ recommender.mjs # Task duration/percentile engine and CSV loader
│  └─ index.mjs       # Express API, auth/team routes, production static server
├─ src/
│  ├─ components/     # Sidebar, topbar, views, quick-add, deadline check, dialogs
│  ├─ config/         # Brand defaults, accent presets, categories, view metadata
│  ├─ hooks/          # Theme and toast state
│  ├─ lib/            # API client, date helpers, filtering, smart suggestions
│  ├─ App.tsx         # App shell, view state, and wiring
│  ├─ main.tsx        # React entry point
│  ├─ styles.css      # Design tokens and shared component styles
│  ├─ app.css         # Sidebar layout and view-specific styles
│  └─ types.ts        # Shared frontend types
├─ data/
│  ├─ reference/      # household_tasks.csv used to train the recommender
│  └─ taskflow.db     # SQLite database (created at runtime)
├─ index.html
├─ vite.config.ts
└─ tsconfig.json
```

## Notes

- The app is intentionally local-only: accounts, teams, and sessions live in the local SQLite file, with no cloud sync and no telemetry.
- Smart add suggestions are keyword-based and run in the browser. Task text is never sent anywhere except your own local API.
- The deadline check is trained locally from `data/reference/household_tasks.csv` plus your own completed tasks. It does not call any external service.
- The API validates usernames, emails, passwords, team names, invite codes, titles, categories, deadlines, priorities, progress values, and brand values before writing.
- Deleting a task records a snapshot so it can be restored later; clearing history removes those snapshots. **Clear completed** deletes finished tasks but keeps their history entries.
- If you lose the password for the only account, there is no recovery flow. You would need to delete the account's rows from the database or start with a fresh database file.
