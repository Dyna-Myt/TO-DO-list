import type {
  AppState,
  AuthResponse,
  BrandConfig,
  BrandResponse,
  ClearCompletedResult,
  DeleteResult,
  RecommendationInput,
  RecommendationResponse,
  SessionResponse,
  TaskDraft,
  TaskUpdate,
  TeamResponse,
  TeamsResponse,
} from "../types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach the local Taskflow service. Make sure `npm run dev` is still running.",
      0,
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // The local API always returns JSON, but keep a useful fallback.
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function statePath(teamId: string | null) {
  return teamId
    ? `/api/state?teamId=${encodeURIComponent(teamId)}`
    : "/api/state";
}

export const api = {
  getSession: () => request<SessionResponse>("/api/auth/me"),

  register: (username: string, email: string, password: string) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),

  login: (identifier: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),

  logout: () =>
    request<{ ok: true }>("/api/auth/logout", {
      method: "POST",
    }),

  getState: (teamId: string | null = null) =>
    request<AppState>(statePath(teamId)),

  recommend: (input: RecommendationInput) =>
    request<RecommendationResponse>("/api/recommender/recommend", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getBrand: () => request<BrandResponse>("/api/brand"),

  saveBrand: (brand: BrandConfig) =>
    request<{ brand: BrandConfig }>("/api/brand", {
      method: "PUT",
      body: JSON.stringify(brand),
    }),

  getTeams: () => request<TeamsResponse>("/api/teams"),

  createTeam: (name: string) =>
    request<TeamResponse>("/api/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  joinTeam: (inviteCode: string) =>
    request<TeamResponse>("/api/teams/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),

  createTask: (task: TaskDraft) =>
    request<AppState>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (id: string, updates: TaskUpdate) =>
    request<AppState>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteTask: (id: string) =>
    request<DeleteResult>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  clearCompleted: (teamId: string | null = null) =>
    request<ClearCompletedResult>(
      teamId
        ? `/api/tasks/completed?teamId=${encodeURIComponent(teamId)}`
        : "/api/tasks/completed",
      { method: "DELETE" },
    ),

  restoreHistory: (id: string) =>
    request<AppState>(`/api/history/${encodeURIComponent(id)}/restore`, {
      method: "POST",
    }),

  clearHistory: (teamId: string | null = null) =>
    request<AppState>(
      teamId ? `/api/history?teamId=${encodeURIComponent(teamId)}` : "/api/history",
      {
        method: "DELETE",
      },
    ),
};
