import { History } from "lucide-react";
import type { HistoryEntry } from "../types";
import { HistoryPanel } from "./HistoryPanel";

interface HistoryViewProps {
  history: HistoryEntry[];
  busy: boolean;
  teamName: string | null;
  canClear: boolean;
  onClear: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

export function HistoryView({
  history,
  busy,
  teamName,
  canClear,
  onClear,
  onRestore,
}: HistoryViewProps) {
  return (
    <div className="history-view">
      <section className="history-hero panel" aria-labelledby="history-view-title">
        <span className="stat-icon stat-icon-sage" aria-hidden="true">
          <History />
        </span>
        <div>
          <p className="section-kicker">
            {teamName ? `${teamName} activity` : "Your activity"}
          </p>
          <h2 id="history-view-title">Everything you have crossed off</h2>
          <p>
            Completed, reopened, and deleted tasks are kept automatically. You
            can restore a deleted task straight from this page.
          </p>
        </div>
      </section>

      <HistoryPanel
        history={history}
        busy={busy}
        teamName={teamName}
        canClear={canClear}
        onClear={onClear}
        onRestore={onRestore}
      />
    </div>
  );
}
