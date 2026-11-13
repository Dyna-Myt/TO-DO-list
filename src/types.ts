export type Priority = "high" | "medium" | "low";

export type TaskFilter = "all" | "active" | "due" | "overdue" | "completed";

export type HistoryType = "completed" | "reopened" | "deleted";

export type TeamRole = "owner" | "member";

export interface Task {
  id: string;
  title: string;
  notes: string;
  category: string;
  deadline: string | null;
  priority: Priority;
  completed: boolean;
  progress: number;
  teamId: string | null;
  ownerId: string;
  ownerUsername: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  taskId: string | null;
  taskTitle: string;
  at: string;
  canRestore: boolean;
  actorUsername: string | null;
}

export interface AppState {
  tasks: Task[];
  history: HistoryEntry[];
}

export interface TaskDraft {
  title: string;
  notes: string;
  category?: string;
  deadline: string | null;
  priority: Priority;
  teamId?: string | null;
}

export type TaskUpdate = Partial<
  Pick<
    Task,
    | "title"
    | "notes"
    | "category"
    | "deadline"
    | "priority"
    | "completed"
    | "progress"
  >
>;

export interface DeleteResult {
  state: AppState;
  deletedHistoryId: string;
}

export interface ClearCompletedResult {
  state: AppState;
  cleared: number;
}

export type AppView =
  | "dashboard"
  | "tasks"
  | "today"
  | "upcoming"
  | "completed"
  | "important"
  | "board"
  | "calendar"
  | "focus"
  | "history"
  | "settings";

export interface BrandConfig {
  name: string;
  logoText: string;
  accent: string;
  tagline: string;
  description: string;
}

export interface BrandResponse {
  brand: BrandConfig | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface SessionResponse {
  user: User | null;
}

export interface TeamMember {
  id: string;
  username: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  role: TeamRole;
  createdAt: string;
  members: TeamMember[];
}

export interface TeamsResponse {
  teams: Team[];
}

export interface TeamResponse {
  team: Team;
}

export type RecommendationRisk =
  | "likely_feasible"
  | "tight"
  | "unlikely"
  | "unknown";

export type RecommendationConfidence = "high" | "medium" | "low";

export interface RecommendationStats {
  task_id: string;
  task: string;
  count: number;
  on_time: number;
  late: number;
  incomplete: number;
  avg_planned: number;
  avg_actual: number | null;
  median_actual: number | null;
  p50: number | null;
  p75: number | null;
  p80: number | null;
  p90: number | null;
  min_actual: number | null;
  max_actual: number | null;
  on_time_rate: number;
}

export interface Recommendation {
  task_id: string | null;
  task: string;
  matched_by: "task_id" | "exact_name" | "normalized_name" | "unknown";
  planned_days: number | null;
  feasible: boolean | null;
  risk: RecommendationRisk;
  risk_label: string;
  on_time_probability: number | null;
  suggested_days_typical: number | null;
  suggested_days_safe: number | null;
  suggested_days_very_safe: number | null;
  suggested_deadline_typical: string | null;
  suggested_deadline_safe: string | null;
  suggested_deadline_very_safe: string | null;
  confidence: RecommendationConfidence;
  reason: string;
  stats: RecommendationStats | null;
}

export interface RecommendationInput {
  taskName?: string;
  taskId?: string;
  plannedDays?: number | null;
  addedDate?: string | null;
  deadlineDate?: string | null;
}

export interface RecommendationResponse {
  recommendation: Recommendation;
}
