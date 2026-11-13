import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./db.mjs";
import { TaskRecommender, loadCsvRows, parseDay } from "./recommender.mjs";
import { hashPassword, verifyPassword } from "./auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 3001;
const isProduction =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";
const databaseFile =
  process.env.TASKFLOW_DB || path.join(rootDir, "data", "taskflow.db");

const SESSION_COOKIE = "taskflow_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DUMMY_PASSWORD_HASH = hashPassword("taskflow-timing-placeholder");

const store = createStore(databaseFile);
const app = express();

// Historical household tasks shipped with the app. They give the deadline
// check a useful baseline before a fresh database has any completions.
const referenceCsv = path.join(
  rootDir,
  "data",
  "reference",
  "household_tasks.csv",
);
const referenceRows = existsSync(referenceCsv) ? loadCsvRows(referenceCsv) : [];

let recommenderVersion = 0;
const recommenderCache = new Map();

function bumpRecommender() {
  recommenderVersion += 1;
}

function getRecommender(userId) {
  const cached = recommenderCache.get(userId);
  if (cached && cached.version === recommenderVersion) {
    return cached.recommender;
  }

  const appRows = store.getCompletedTasksForUser(userId).map((task) => ({
    task_id: "",
    task: task.title,
    added_date: task.createdAt,
    deadline_date: task.deadline,
    completed_date: task.completedAt,
  }));

  const recommender = TaskRecommender.fromRows([...referenceRows, ...appRows]);
  recommenderCache.set(userId, { version: recommenderVersion, recommender });
  return recommender;
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function textField(value, name, maxLength, { required = false, fallback = "" } = {}) {
  if (value === undefined || value === null) {
    if (required) throw httpError(400, `${name} is required.`);
    return fallback;
  }

  if (typeof value !== "string") {
    throw httpError(400, `${name} must be text.`);
  }

  const clean = value.trim();
  if (required && !clean) throw httpError(400, `${name} is required.`);
  return clean.slice(0, maxLength);
}

function normalizeTitle(value) {
  return textField(value, "Task title", 140, { required: true });
}

function normalizeNotes(value) {
  return textField(value, "Note", 500);
}

function normalizeCategory(value) {
  const category = textField(value, "Category", 40, { fallback: "General" });
  return category || "General";
}

function normalizeDeadline(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value !== "string") {
    throw httpError(400, "Deadline must be a date.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, "Deadline is not a valid date.");
  }

  return date.toISOString();
}

function normalizePriority(value) {
  if (value === undefined) return "medium";
  if (value !== "high" && value !== "medium" && value !== "low") {
    throw httpError(400, "Priority must be high, medium, or low.");
  }
  return value;
}

function normalizeCompleted(value) {
  if (typeof value !== "boolean") {
    throw httpError(400, "Completed must be true or false.");
  }
  return value;
}

function normalizeProgress(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw httpError(400, "Progress must be a number between 0 and 100.");
  }
  const progress = Math.round(value);
  if (progress < 0 || progress > 100) {
    throw httpError(400, "Progress must be between 0 and 100.");
  }
  return progress;
}

function normalizeTeamId(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw httpError(400, "Team is invalid.");
  return value;
}

function normalizePlannedDays(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw httpError(400, "Planned days must be a number.");
  }
  const days = Math.round(value);
  if (days < 0 || days > 3650) {
    throw httpError(400, "Planned days must be between 0 and 3650.");
  }
  return days;
}

function normalizeDayInput(value, name) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || parseDay(value) === null) {
    throw httpError(400, `${name} is not a valid date.`);
  }
  return value;
}

function normalizeTeamName(value) {
  const name = textField(value, "Team name", 40, { required: true });
  if (name.length < 2) {
    throw httpError(400, "Team name must be at least 2 characters.");
  }
  return name;
}

function normalizeInviteCode(value) {
  const code = textField(value, "Invite code", 16, { required: true }).toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(code)) {
    throw httpError(400, "Enter the 8-character invite code.");
  }
  return code;
}

function normalizeBrand(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, "Brand settings are required.");
  }

  const name = textField(value.name, "Brand name", 40, { required: true });
  const logoText = textField(value.logoText, "Logo text", 3, {
    required: true,
    fallback: "✓",
  });
  const accent =
    typeof value.accent === "string" && /^#[0-9a-f]{6}$/i.test(value.accent)
      ? value.accent.toLowerCase()
      : null;

  if (!accent) throw httpError(400, "Accent color must be a six-digit hex color.");
  if (typeof value.tagline !== "string" || !value.tagline.trim()) {
    throw httpError(400, "Tagline is required.");
  }
  if (typeof value.description !== "string" || !value.description.trim()) {
    throw httpError(400, "Description is required.");
  }

  return {
    name,
    logoText,
    accent,
    tagline: value.tagline.trim().slice(0, 120),
    description: value.description.trim().slice(0, 220),
  };
}

function normalizeEmail(value) {
  if (typeof value !== "string") throw httpError(400, "Email is required.");

  const email = value.trim().toLowerCase();
  if (!email) throw httpError(400, "Email is required.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Enter a valid email address.");
  }
  return email;
}

function normalizeUsername(value) {
  if (typeof value !== "string") throw httpError(400, "Username is required.");

  const username = value.trim();
  if (!username) throw httpError(400, "Username is required.");
  if (username.length < 3) {
    throw httpError(400, "Username must be at least 3 characters.");
  }
  if (username.length > 24) {
    throw httpError(400, "Username must be 24 characters or fewer.");
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    throw httpError(
      400,
      "Username can only use letters, numbers, dots, dashes, and underscores.",
    );
  }
  return username;
}

function normalizeIdentifier(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw httpError(400, "Email or username is required.");
  }
  const identifier = value.trim();
  if (identifier.length > 254) {
    throw httpError(400, "Email or username is too long.");
  }
  return identifier;
}

function normalizePassword(value) {
  if (typeof value !== "string" || !value) {
    throw httpError(400, "Password is required.");
  }
  if (value.length < 8) {
    throw httpError(400, "Password must be at least 8 characters.");
  }
  if (value.length > 200) {
    throw httpError(400, "Password must be 200 characters or fewer.");
  }
  return value;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    if (!name) continue;

    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}

function readSessionToken(request) {
  return parseCookies(request.headers.cookie)[SESSION_COOKIE] ?? null;
}

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function requireAuth(request, _response, next) {
  const token = readSessionToken(request);
  const user = token ? store.getSession(token) : null;

  if (!user) {
    next(httpError(401, "Please sign in to continue."));
    return;
  }

  request.user = user;
  request.sessionToken = token;
  next();
}

function requireTeamState(userId, teamId) {
  const state = store.getState(userId, teamId);
  if (!state) throw httpError(404, "Team not found.");
  return state;
}

function readTeamId(request) {
  return normalizeTeamId(request.query.teamId ?? request.body?.teamId);
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/auth/me", (request, response) => {
  const token = readSessionToken(request);
  const user = token ? store.getSession(token) : null;

  if (token && !user) clearSessionCookie(response);
  response.json({ user });
});

app.post("/api/auth/register", (request, response) => {
  const body = request.body ?? {};
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);

  const result = store.createUser(username, email, hashPassword(password));
  if (!result.ok) {
    throw httpError(
      409,
      result.reason === "username_taken"
        ? "That username is already taken."
        : "An account with that email already exists.",
    );
  }

  const session = store.createSession(result.user.id);
  setSessionCookie(response, session.token);
  response.status(201).json({ user: result.user });
});

app.post("/api/auth/login", (request, response) => {
  const body = request.body ?? {};
  const identifier = normalizeIdentifier(body.identifier ?? body.email);

  if (typeof body.password !== "string" || !body.password) {
    throw httpError(400, "Password is required.");
  }

  const user = store.findUserByIdentifier(identifier);
  const passwordMatches = verifyPassword(
    body.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw httpError(401, "Incorrect email, username, or password.");
  }

  const previousToken = readSessionToken(request);
  if (previousToken) store.deleteSession(previousToken);

  const session = store.createSession(user.id);
  setSessionCookie(response, session.token);
  response.json({
    user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
  });
});

app.post("/api/auth/logout", (request, response) => {
  const token = readSessionToken(request);
  if (token) store.deleteSession(token);

  clearSessionCookie(response);
  response.json({ ok: true });
});

app.get("/api/brand", (_request, response) => {
  response.json({ brand: store.getBrand() });
});

app.get("/api/teams", requireAuth, (request, response) => {
  response.json({ teams: store.getTeams(request.user.id) });
});

app.post("/api/teams", requireAuth, (request, response) => {
  const body = request.body ?? {};
  const team = store.createTeam(request.user.id, normalizeTeamName(body.name));
  response.status(201).json({ team });
});

app.post("/api/teams/join", requireAuth, (request, response) => {
  const body = request.body ?? {};
  const result = store.joinTeam(request.user.id, normalizeInviteCode(body.inviteCode));

  if (!result.ok) {
    throw httpError(
      result.reason === "already_member" ? 409 : 404,
      result.reason === "already_member"
        ? "You are already a member of that team."
        : "No team matches that invite code.",
    );
  }

  response.json({ team: result.team });
});

app.get("/api/state", requireAuth, (request, response) => {
  response.json(requireTeamState(request.user.id, readTeamId(request)));
});

app.post("/api/recommender/recommend", requireAuth, (request, response) => {
  const body = request.body ?? {};
  const taskName = textField(body.taskName, "Task name", 140, { fallback: "" });
  const taskId = textField(body.taskId, "Task id", 40, { fallback: "" });

  if (!taskName && !taskId) {
    throw httpError(400, "Provide a task name or task id.");
  }

  const recommendation = getRecommender(request.user.id).recommend({
    taskId: taskId || null,
    taskName: taskName || null,
    plannedDays: normalizePlannedDays(body.plannedDays),
    addedDate: normalizeDayInput(body.addedDate, "Added date"),
    deadlineDate: normalizeDayInput(body.deadlineDate, "Deadline"),
    outputDateFormat: "iso",
  });

  response.json({ recommendation });
});

app.put("/api/brand", requireAuth, (request, response) => {
  const brand = normalizeBrand(request.body);
  response.json({ brand: store.saveBrand(brand) });
});

app.post("/api/tasks", requireAuth, (request, response) => {
  const body = request.body ?? {};
  const state = store.createTask(request.user.id, {
    title: normalizeTitle(body.title),
    notes: normalizeNotes(body.notes),
    category: normalizeCategory(body.category),
    deadline: normalizeDeadline(body.deadline),
    priority: normalizePriority(body.priority),
    teamId: normalizeTeamId(body.teamId),
  });

  if (!state) throw httpError(404, "Team not found.");
  bumpRecommender();
  response.status(201).json(state);
});

app.patch("/api/tasks/:id", requireAuth, (request, response) => {
  const body = request.body ?? {};
  const updates = {};

  if (Object.hasOwn(body, "title")) updates.title = normalizeTitle(body.title);
  if (Object.hasOwn(body, "notes")) updates.notes = normalizeNotes(body.notes);
  if (Object.hasOwn(body, "category")) {
    updates.category = normalizeCategory(body.category);
  }
  if (Object.hasOwn(body, "deadline")) {
    updates.deadline = normalizeDeadline(body.deadline);
  }
  if (Object.hasOwn(body, "priority")) {
    updates.priority = normalizePriority(body.priority);
  }
  if (Object.hasOwn(body, "completed")) {
    updates.completed = normalizeCompleted(body.completed);
  }
  if (Object.hasOwn(body, "progress")) {
    updates.progress = normalizeProgress(body.progress);
  }

  const result = store.updateTask(request.user.id, request.params.id, updates);
  if (!result) throw httpError(404, "Task not found.");
  if (!result.ok) {
    throw httpError(403, "Only the task owner or team owner can change this task.");
  }
  bumpRecommender();
  response.json(result.state);
});

app.delete("/api/tasks/completed", requireAuth, (request, response) => {
  const result = store.clearCompleted(request.user.id, readTeamId(request));
  if (!result) throw httpError(404, "Team not found.");
  bumpRecommender();
  response.json(result);
});

app.delete("/api/tasks/:id", requireAuth, (request, response) => {
  const result = store.deleteTask(request.user.id, request.params.id);
  if (!result) throw httpError(404, "Task not found.");
  if (!result.ok) {
    throw httpError(403, "Only the task owner or team owner can delete this task.");
  }
  bumpRecommender();
  response.json(result);
});

app.post("/api/history/:id/restore", requireAuth, (request, response) => {
  const result = store.restoreHistory(request.user.id, request.params.id);
  if (!result.ok) {
    if (result.reason === "already_exists") {
      throw httpError(409, "That task already exists.");
    }
    if (result.reason === "forbidden") {
      throw httpError(403, "Only the task owner or team owner can restore this task.");
    }
    throw httpError(404, "This deleted task cannot be restored.");
  }

  bumpRecommender();
  response.json(result.state);
});

app.delete("/api/history", requireAuth, (request, response) => {
  const result = store.clearHistory(request.user.id, readTeamId(request));
  if (!result.ok) {
    throw httpError(403, "Only the team owner can clear team activity.");
  }
  response.json(result.state);
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

if (isProduction) {
  const distDir = path.join(rootDir, "dist");
  const indexPath = path.join(distDir, "index.html");

  if (!existsSync(indexPath)) {
    console.error("The production build was not found. Run `npm run build` first.");
    process.exit(1);
  }

  app.use(express.static(distDir, { index: false }));
  app.use((request, response, next) => {
    if (request.method !== "GET") return next();
    response.sendFile(indexPath);
  });
}

app.use((error, _request, response, _next) => {
  const status =
    error.status || (error.type === "entity.parse.failed" ? 400 : 500);

  if (status >= 500) {
    console.error(error);
  }

  response.status(status).json({
    error:
      status >= 500 && error.status === undefined
        ? "The local service ran into an unexpected error."
        : error.message,
  });
});

const server = app.listen(port, "127.0.0.1", () => {
  if (isProduction) {
    console.log(`Taskflow is running at http://localhost:${port}`);
  } else {
    console.log(`Taskflow API is running at http://localhost:${port}`);
    console.log(`Database: ${databaseFile}`);
  }
});

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
