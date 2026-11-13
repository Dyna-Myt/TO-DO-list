import { Check, Clock3, LockKeyhole, RotateCcw, Trash2, Undo2, Users } from "lucide-react";
import type { HistoryEntry, HistoryType } from "../types";
import { formatFullDate, formatHistoryTime } from "../lib/dates";

const HISTORY_META: Record<
  HistoryType,
  { label: string; icon: typeof Check }
> = {
  completed: { label: "Completed", icon: Check },
  reopened: { label: "Reopened", icon: RotateCcw },
  deleted: { label: "Deleted", icon: Trash2 },
};

interface HistoryPanelProps {
  history: HistoryEntry[];
  busy: boolean;
  teamName: string | null;
  canClear: boolean;
  onClear: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

export function HistoryPanel({
  history,
  busy,
  teamName,
  canClear,
  onClear,
  onRestore,
}: HistoryPanelProps) {
  const entries = [...history].sort(
    (first, second) => new Date(second.at).getTime() - new Date(first.at).getTime(),
  );
  const isTeam = teamName !== null;

  return (
    <aside className="history-card" aria-labelledby="history-title">
      <div className="history-head">
        <div>
          <p className="section-kicker">
            {isTeam ? "Team activity" : "Activity log"}
          </p>
          <h2 id="history-title">
            {isTeam ? "Team history" : "History"}{" "}
            <span className="count-pill">{entries.length}</span>
          </h2>
        </div>
        <button
          className="text-button"
          type="button"
          disabled={entries.length === 0 || busy || !canClear}
          title={
            canClear
              ? undefined
              : "Only the team owner can clear team activity"
          }
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <p className="history-intro">
        {isTeam
          ? `Completed, reopened, and deleted tasks in ${teamName} are visible to every member.`
          : "Completed, reopened, and deleted tasks are kept here automatically."}
      </p>

      <div className="history-scroll">
        {entries.length === 0 ? (
          <div className="history-empty">
            <span className="history-empty-icon" aria-hidden="true">
              <Clock3 />
            </span>
            <p>
              <strong>Nothing here yet</strong>
              Complete or delete a task and it will be saved here.
            </p>
          </div>
        ) : (
          <ol className="history-list">
            {entries.map((entry) => {
              const meta = HISTORY_META[entry.type];
              const Icon = meta.icon;

              return (
                <li
                  className="history-item"
                  data-type={entry.type}
                  key={entry.id}
                >
                  <span className="history-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="history-content">
                    <p className="history-line">
                      <span className="history-action">{meta.label}</span>
                      <span className="history-task">“{entry.taskTitle}”</span>
                    </p>
                    <div className="history-foot">
                      {isTeam && entry.actorUsername ? (
                        <span className="history-actor">
                          @{entry.actorUsername}
                        </span>
                      ) : null}
                      <time
                        className="history-time"
                        dateTime={entry.at}
                        title={formatFullDate(entry.at)}
                      >
                        {formatHistoryTime(entry.at)}
                      </time>
                      {entry.canRestore ? (
                        <button
                          className="history-restore"
                          type="button"
                          disabled={busy}
                          onClick={() => onRestore(entry)}
                          aria-label={`Restore “${entry.taskTitle}”`}
                        >
                          <Undo2 aria-hidden="true" />
                          Restore
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p className="history-footer">
        {isTeam ? (
          <Users aria-hidden="true" />
        ) : (
          <LockKeyhole aria-hidden="true" />
        )}
        <span>{isTeam ? "Visible to the team" : "Stored in local SQLite"}</span>
        <span aria-hidden="true">·</span>
        <span>
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </p>
    </aside>
  );
}
