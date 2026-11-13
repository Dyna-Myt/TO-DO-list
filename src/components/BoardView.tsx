import { CircleDashed, Columns3, Loader, Plus, Sparkles } from "lucide-react";
import type { Task, TeamRole } from "../types";
import { TaskCard } from "./TaskCard";

interface BoardViewProps {
  tasks: Task[];
  currentUserId: string;
  teamRole: TeamRole | null;
  teamName: string | null;
  busy: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddTask: () => void;
}

interface BoardColumn {
  id: string;
  title: string;
  hint: string;
  icon: typeof CircleDashed;
  tasks: Task[];
}

export function BoardView({
  tasks,
  currentUserId,
  teamRole,
  teamName,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onAddTask,
}: BoardViewProps) {
  function canManage(task: Task) {
    if (!task.teamId) return task.ownerId === currentUserId;
    return task.ownerId === currentUserId || teamRole === "owner";
  }

  const columns: BoardColumn[] = [
    {
      id: "pending",
      title: "Pending",
      hint: "Not started",
      icon: CircleDashed,
      tasks: tasks.filter((task) => !task.completed && task.progress <= 0),
    },
    {
      id: "progress",
      title: "In progress",
      hint: "Partway there",
      icon: Loader,
      tasks: tasks.filter(
        (task) => !task.completed && task.progress > 0 && task.progress < 100,
      ),
    },
    {
      id: "done",
      title: "Done",
      hint: "Crossed off",
      icon: Sparkles,
      tasks: tasks.filter((task) => task.completed || task.progress >= 100),
    },
  ];

  return (
    <div className="board-view">
      <div className="board-head">
        <p className="board-summary">
          <Columns3 aria-hidden="true" />
          {tasks.length} task{tasks.length === 1 ? "" : "s"} on the{" "}
          {teamName ? `${teamName} board` : "personal board"}
        </p>
        <button className="text-button" type="button" onClick={onAddTask}>
          <Plus aria-hidden="true" />
          Add task
        </button>
      </div>

      <div className="board-columns">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <section
              className={`board-column board-column-${column.id}`}
              key={column.id}
              aria-labelledby={`board-${column.id}`}
            >
              <header className="board-column-head">
                <span className="board-column-icon" aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <h2 id={`board-${column.id}`}>{column.title}</h2>
                  <p>{column.hint}</p>
                </div>
                <span className="board-count">{column.tasks.length}</span>
              </header>

              <div className="board-column-body">
                {column.tasks.length ? (
                  column.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={currentUserId}
                      disabled={busy}
                      canManage={canManage(task)}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                ) : (
                  <p className="board-empty">
                    {column.id === "done"
                      ? "Finished tasks will land here."
                      : "Nothing here yet."}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
