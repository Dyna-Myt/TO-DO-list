import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    category: row.category ?? "General",
    deadline: row.deadline,
    priority: row.priority,
    completed: row.completed === 1,
    progress: Number.isInteger(row.progress) ? row.progress : row.completed === 1 ? 100 : 0,
    teamId: row.team_id ?? null,
    ownerId: row.user_id,
    ownerUsername: row.owner_username ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapHistory(row, canRestore = false) {
  return {
    id: row.id,
    type: row.type,
    taskId: row.task_id,
    taskTitle: row.task_title,
    at: row.at,
    canRestore:
      canRestore && row.type === "deleted" && Boolean(row.task_snapshot),
    actorUsername: row.actor_username ?? null,
  };
}

function mapUser(row) {
  return {
    id: row.id,
    username: row.username ?? row.email.split("@")[0],
    email: row.email,
    createdAt: row.created_at,
  };
}

function mapTeamMember(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

function mapTeam(row, members) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    role: row.role,
    createdAt: row.created_at,
    members,
  };
}

function withTransaction(db, callback) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function hasColumn(db, table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row.name === column);
}

function ensureColumn(db, table, column, definition) {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function cleanUsernameBase(email) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 18);
  return base || "member";
}

export function createStore(dbFile) {
  mkdirSync(dirname(dbFile), { recursive: true });

  const db = new DatabaseSync(dbFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      joined_at TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      deadline TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      created_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('completed', 'reopened', 'deleted')),
      task_id TEXT,
      task_title TEXT NOT NULL,
      at TEXT NOT NULL,
      task_snapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);
    CREATE INDEX IF NOT EXISTS idx_history_at ON history (at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
    CREATE INDEX IF NOT EXISTS idx_teams_invite ON teams (invite_code);
  `);

  // Older Taskflow databases predate accounts and teams. Add columns without
  // losing existing rows; the first account claims unowned personal rows.
  ensureColumn(db, "users", "username", "TEXT COLLATE NOCASE");
  ensureColumn(db, "tasks", "category", "TEXT NOT NULL DEFAULT 'General'");
  ensureColumn(db, "tasks", "team_id", "TEXT REFERENCES teams(id) ON DELETE CASCADE");
  ensureColumn(
    db,
    "tasks",
    "progress",
    "INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)",
  );
  ensureColumn(db, "history", "team_id", "TEXT REFERENCES teams(id) ON DELETE CASCADE");

  const usersWithoutUsername = db
    .prepare("SELECT id, email FROM users WHERE username IS NULL OR username = ''")
    .all();
  for (const user of usersWithoutUsername) {
    const base = cleanUsernameBase(user.email);
    let candidate = base;
    let suffix = 1;
    while (
      db
        .prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE")
        .get(candidate)
    ) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(candidate, user.id);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
      ON users (username COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks (team_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_history_user ON history (user_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_team ON history (team_id, at DESC);

    UPDATE tasks SET progress = 100 WHERE completed = 1 AND progress <> 100;
    UPDATE tasks SET progress = 0 WHERE completed = 0 AND progress = 100;
  `);

  const selectTasksPersonal = db.prepare(`
    SELECT t.*, u.username AS owner_username
    FROM tasks t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.user_id = ? AND t.team_id IS NULL
    ORDER BY t.created_at ASC
  `);
  const selectTasksTeam = db.prepare(`
    SELECT t.*, u.username AS owner_username
    FROM tasks t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.team_id = ?
    ORDER BY t.created_at ASC
  `);
  const selectHistoryPersonal = db.prepare(`
    SELECT h.*, u.username AS actor_username
    FROM history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.user_id = ? AND h.team_id IS NULL
    ORDER BY h.at DESC
  `);
  const selectHistoryTeam = db.prepare(`
    SELECT h.*, u.username AS actor_username
    FROM history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.team_id = ?
    ORDER BY h.at DESC
  `);
  const selectTaskById = db.prepare(`
    SELECT t.*, u.username AS owner_username
    FROM tasks t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
  `);
  const selectTaskExists = db.prepare("SELECT 1 FROM tasks WHERE id = ?");
  const selectHistoryById = db.prepare(`
    SELECT h.*, u.username AS actor_username
    FROM history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.id = ?
  `);
  const selectCompletedTasksForUser = db.prepare(`
    SELECT DISTINCT t.id, t.title, t.created_at, t.deadline, t.completed_at
    FROM tasks t
    LEFT JOIN team_members m
      ON m.team_id = t.team_id AND m.user_id = ?
    WHERE t.completed = 1
      AND t.completed_at IS NOT NULL
      AND (t.user_id = ? OR m.user_id IS NOT NULL)
    ORDER BY t.completed_at ASC
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, user_id, team_id, title, notes, category, deadline, priority,
      completed, progress, created_at, completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertHistory = db.prepare(`
    INSERT INTO history (
      id, user_id, team_id, type, task_id, task_title, at, task_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUser = db.prepare(
    "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const selectUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
  const selectUserByUsername = db.prepare(
    "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
  );
  const selectUserById = db.prepare("SELECT * FROM users WHERE id = ?");
  const countUsers = db.prepare("SELECT COUNT(*) AS count FROM users");

  const insertSession = db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  );
  const selectSession = db.prepare(
    "SELECT token, user_id, expires_at FROM sessions WHERE token = ?",
  );
  const deleteSessionByToken = db.prepare("DELETE FROM sessions WHERE token = ?");
  const deleteExpiredSessions = db.prepare(
    "DELETE FROM sessions WHERE expires_at <= ?",
  );

  const selectTeamsForUser = db.prepare(`
    SELECT t.*, m.role AS role
    FROM teams t
    JOIN team_members m ON m.team_id = t.id
    WHERE m.user_id = ?
    ORDER BY t.created_at ASC
  `);
  const selectTeamForUser = db.prepare(`
    SELECT t.*, m.role AS role
    FROM teams t
    JOIN team_members m ON m.team_id = t.id
    WHERE t.id = ? AND m.user_id = ?
  `);
  const selectTeamMembers = db.prepare(`
    SELECT u.id, u.username, u.email, m.role, m.joined_at
    FROM team_members m
    JOIN users u ON u.id = m.user_id
    WHERE m.team_id = ?
    ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.joined_at ASC
  `);
  const selectTeamMembership = db.prepare(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ?",
  );
  const selectTeamByInvite = db.prepare("SELECT * FROM teams WHERE invite_code = ?");
  const insertTeam = db.prepare(
    "INSERT INTO teams (id, name, invite_code, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertTeamMember = db.prepare(
    "INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)",
  );

  function isTeamMember(teamId, userId) {
    return Boolean(selectTeamMembership.get(teamId, userId));
  }

  function isTeamOwner(teamId, userId) {
    return selectTeamMembership.get(teamId, userId)?.role === "owner";
  }

  function getTeamMembers(teamId) {
    return selectTeamMembers.all(teamId).map(mapTeamMember);
  }

  function getTeamForUser(userId, teamId) {
    const row = selectTeamForUser.get(teamId, userId);
    return row ? mapTeam(row, getTeamMembers(row.id)) : null;
  }

  function getTeams(userId) {
    return selectTeamsForUser
      .all(userId)
      .map((row) => mapTeam(row, getTeamMembers(row.id)));
  }

  function getCompletedTasksForUser(userId) {
    return selectCompletedTasksForUser.all(userId, userId).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      deadline: row.deadline,
      completedAt: row.completed_at,
    }));
  }

  function getTaskForUser(userId, id) {
    const row = selectTaskById.get(id);
    if (!row) return null;

    const task = mapTask(row);
    if (task.teamId) {
      if (!isTeamMember(task.teamId, userId)) return null;
    } else if (task.ownerId !== userId) {
      return null;
    }

    return task;
  }

  function canManageTask(userId, task) {
    if (!task.teamId) return task.ownerId === userId;
    return task.ownerId === userId || isTeamOwner(task.teamId, userId);
  }

  function getState(userId, teamId = null) {
    if (teamId) {
      if (!isTeamMember(teamId, userId)) return null;

      const teamOwner = isTeamOwner(teamId, userId);
      return {
        tasks: selectTasksTeam.all(teamId).map(mapTask),
        history: selectHistoryTeam
          .all(teamId)
          .map((row) =>
            mapHistory(row, teamOwner || row.user_id === userId),
          ),
      };
    }

    return {
      tasks: selectTasksPersonal.all(userId).map(mapTask),
      history: selectHistoryPersonal
        .all(userId)
        .map((row) => mapHistory(row, true)),
    };
  }

  function createTask(userId, input) {
    const teamId = input.teamId ?? null;
    if (teamId && !isTeamMember(teamId, userId)) return null;

    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      title: input.title,
      notes: input.notes,
      category: input.category,
      deadline: input.deadline,
      priority: input.priority,
    };

    insertTask.run(
      task.id,
      userId,
      teamId,
      task.title,
      task.notes,
      task.category,
      task.deadline,
      task.priority,
      0,
      0,
      now,
      null,
      now,
    );

    return getState(userId, teamId);
  }

  function updateTask(userId, id, input) {
    const current = getTaskForUser(userId, id);
    if (!current) return null;
    if (!canManageTask(userId, current)) {
      return { ok: false, reason: "forbidden" };
    }

    const now = new Date().toISOString();
    const fields = ["updated_at = ?"];
    const values = [now];
    let transition = null;

    if (Object.hasOwn(input, "title")) {
      fields.push("title = ?");
      values.push(input.title);
    }
    if (Object.hasOwn(input, "notes")) {
      fields.push("notes = ?");
      values.push(input.notes);
    }
    if (Object.hasOwn(input, "category")) {
      fields.push("category = ?");
      values.push(input.category);
    }
    if (Object.hasOwn(input, "deadline")) {
      fields.push("deadline = ?");
      values.push(input.deadline);
    }
    if (Object.hasOwn(input, "priority")) {
      fields.push("priority = ?");
      values.push(input.priority);
    }

    let nextProgress = current.progress;
    let nextCompleted = current.completed;
    let progressTouched = false;

    if (Object.hasOwn(input, "completed")) {
      nextCompleted = input.completed;
      nextProgress = input.completed ? 100 : 0;
      progressTouched = true;
    }
    if (Object.hasOwn(input, "progress")) {
      nextProgress = input.progress;
      nextCompleted = input.progress === 100;
      progressTouched = true;
    }

    if (progressTouched) {
      fields.push("progress = ?", "completed = ?", "completed_at = ?");
      values.push(
        nextProgress,
        nextCompleted ? 1 : 0,
        nextCompleted ? (current.completedAt ?? now) : null,
      );

      if (nextCompleted !== current.completed) {
        transition = nextCompleted ? "completed" : "reopened";
      }
    }

    values.push(id);

    withTransaction(db, () => {
      db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(
        ...values,
      );

      if (transition) {
        insertHistory.run(
          randomUUID(),
          userId,
          current.teamId,
          transition,
          current.id,
          input.title ?? current.title,
          now,
          null,
        );
      }
    });

    return { ok: true, state: getState(userId, current.teamId) };
  }

  function deleteTask(userId, id) {
    const task = getTaskForUser(userId, id);
    if (!task) return null;
    if (!canManageTask(userId, task)) {
      return { ok: false, reason: "forbidden" };
    }

    const historyId = randomUUID();
    const now = new Date().toISOString();

    withTransaction(db, () => {
      insertHistory.run(
        historyId,
        userId,
        task.teamId,
        "deleted",
        task.id,
        task.title,
        now,
        JSON.stringify(task),
      );
      db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
    });

    return {
      ok: true,
      state: getState(userId, task.teamId),
      deletedHistoryId: historyId,
    };
  }

  function restoreHistory(userId, id) {
    const row = selectHistoryById.get(id);
    if (!row || row.type !== "deleted" || !row.task_snapshot) {
      return { ok: false, reason: "not_found" };
    }

    const teamId = row.team_id ?? null;
    if (teamId) {
      if (!isTeamMember(teamId, userId)) {
        return { ok: false, reason: "not_found" };
      }
      if (row.user_id !== userId && !isTeamOwner(teamId, userId)) {
        return { ok: false, reason: "forbidden" };
      }
    } else if (row.user_id !== userId) {
      return { ok: false, reason: "not_found" };
    }

    let task;
    try {
      task = JSON.parse(row.task_snapshot);
    } catch {
      return { ok: false, reason: "invalid_snapshot" };
    }

    if (
      !task ||
      typeof task.id !== "string" ||
      typeof task.title !== "string" ||
      !task.title.trim()
    ) {
      return { ok: false, reason: "invalid_snapshot" };
    }

    if (selectTaskExists.get(task.id)) {
      return { ok: false, reason: "already_exists" };
    }

    const now = new Date().toISOString();
    const priority = VALID_PRIORITIES.has(task.priority) ? task.priority : "medium";
    const snapshotOwner =
      typeof task.ownerId === "string" ? task.ownerId : null;
    const ownerId =
      teamId && snapshotOwner && isTeamMember(teamId, snapshotOwner)
        ? snapshotOwner
        : userId;
    const progress = Number.isInteger(task.progress)
      ? Math.min(100, Math.max(0, task.progress))
      : task.completed
        ? 100
        : 0;
    const completed = progress === 100;

    withTransaction(db, () => {
      insertTask.run(
        task.id,
        ownerId,
        teamId,
        task.title.trim().slice(0, 140),
        typeof task.notes === "string" ? task.notes.slice(0, 500) : "",
        typeof task.category === "string" && task.category.trim()
          ? task.category.trim().slice(0, 40)
          : "General",
        typeof task.deadline === "string" ? task.deadline : null,
        priority,
        completed ? 1 : 0,
        progress,
        typeof task.createdAt === "string" ? task.createdAt : now,
        completed
          ? typeof task.completedAt === "string"
            ? task.completedAt
            : now
          : null,
        now,
      );
      db.prepare("DELETE FROM history WHERE id = ?").run(id);
    });

    return { ok: true, state: getState(userId, teamId) };
  }

  function clearHistory(userId, teamId = null) {
    if (teamId) {
      if (!isTeamOwner(teamId, userId)) {
        return { ok: false, reason: "forbidden" };
      }
      db.prepare("DELETE FROM history WHERE team_id = ?").run(teamId);
    } else {
      db.prepare(
        "DELETE FROM history WHERE user_id = ? AND team_id IS NULL",
      ).run(userId);
    }

    return { ok: true, state: getState(userId, teamId) };
  }

  function getUserById(id) {
    const row = selectUserById.get(id);
    return row ? mapUser(row) : null;
  }

  function findUserByEmail(email) {
    const row = selectUserByEmail.get(email);
    return row ? { ...mapUser(row), passwordHash: row.password_hash } : null;
  }

  function findUserByIdentifier(identifier) {
    const clean = identifier.trim();
    const row = clean.includes("@")
      ? selectUserByEmail.get(clean.toLowerCase())
      : selectUserByUsername.get(clean);
    return row ? { ...mapUser(row), passwordHash: row.password_hash } : null;
  }

  function createUser(username, email, passwordHash) {
    if (selectUserByEmail.get(email)) {
      return { ok: false, reason: "email_taken" };
    }
    if (selectUserByUsername.get(username)) {
      return { ok: false, reason: "username_taken" };
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    withTransaction(db, () => {
      const firstAccount = countUsers.get().count === 0;
      insertUser.run(id, username, email, passwordHash, now);

      // Preserve tasks created before authentication existed by handing them
      // to the very first account registered on this database.
      if (firstAccount) {
        db.prepare(
          "UPDATE tasks SET user_id = ? WHERE user_id IS NULL",
        ).run(id);
        db.prepare(
          "UPDATE history SET user_id = ? WHERE user_id IS NULL",
        ).run(id);
      }
    });

    return { ok: true, user: { id, username, email, createdAt: now } };
  }

  function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    deleteExpiredSessions.run(now.toISOString());
    insertSession.run(token, userId, now.toISOString(), expiresAt.toISOString());

    return { token, expiresAt: expiresAt.toISOString() };
  }

  function getSession(token) {
    if (!token) return null;

    const row = selectSession.get(token);
    if (!row) return null;

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      deleteSessionByToken.run(token);
      return null;
    }

    return getUserById(row.user_id);
  }

  function deleteSession(token) {
    if (token) deleteSessionByToken.run(token);
  }

  function createTeam(userId, name) {
    const id = randomUUID();
    const now = new Date().toISOString();

    let inviteCode;
    do {
      inviteCode = randomBytes(4).toString("hex").toUpperCase();
    } while (selectTeamByInvite.get(inviteCode));

    withTransaction(db, () => {
      insertTeam.run(id, name, inviteCode, userId, now);
      insertTeamMember.run(id, userId, "owner", now);
    });

    return getTeamForUser(userId, id);
  }

  function joinTeam(userId, inviteCode) {
    const team = selectTeamByInvite.get(inviteCode);
    if (!team) return { ok: false, reason: "not_found" };
    if (isTeamMember(team.id, userId)) {
      return { ok: false, reason: "already_member" };
    }

    insertTeamMember.run(team.id, userId, "member", new Date().toISOString());
    return { ok: true, team: getTeamForUser(userId, team.id) };
  }

  function clearCompleted(userId, teamId = null) {
    if (teamId && !isTeamMember(teamId, userId)) return null;

    const rows = teamId
      ? selectTasksTeam.all(teamId).map(mapTask)
      : selectTasksPersonal.all(userId).map(mapTask);
    const teamOwner = teamId ? isTeamOwner(teamId, userId) : true;
    const removable = rows.filter(
      (task) => task.completed && (task.ownerId === userId || teamOwner),
    );
    const now = new Date().toISOString();

    if (removable.length) {
      withTransaction(db, () => {
        for (const task of removable) {
          insertHistory.run(
            randomUUID(),
            userId,
            task.teamId,
            "deleted",
            task.id,
            task.title,
            now,
            JSON.stringify(task),
          );
          db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
        }
      });
    }

    return {
      ok: true,
      cleared: removable.length,
      state: getState(userId, teamId),
    };
  }

  function getBrand() {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("brand");
    if (!row) return null;

    try {
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  }

  function saveBrand(brand) {
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES ('brand', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(brand));
    return brand;
  }

  function close() {
    db.close();
  }

  return {
    getState,
    createTask,
    updateTask,
    deleteTask,
    restoreHistory,
    clearHistory,
    clearCompleted,
    getCompletedTasksForUser,
    getUserById,
    findUserByEmail,
    findUserByIdentifier,
    createUser,
    createSession,
    getSession,
    deleteSession,
    getTeams,
    getTeamForUser,
    createTeam,
    joinTeam,
    isTeamMember,
    getBrand,
    saveBrand,
    close,
  };
}
