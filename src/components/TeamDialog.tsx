import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  Users,
  X,
} from "lucide-react";
import type { Team } from "../types";
import { Modal } from "./Modal";

interface TeamDialogProps {
  open: boolean;
  teams: Team[];
  activeTeamId: string | null;
  onClose: () => void;
  onSelect: (teamId: string) => void;
  onCreate: (name: string) => Promise<boolean>;
  onJoin: (inviteCode: string) => Promise<boolean>;
}

export function TeamDialog({
  open,
  teams,
  activeTeamId,
  onClose,
  onSelect,
  onCreate,
  onJoin,
}: TeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [working, setWorking] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTeamName("");
    setInviteCode("");
    setWorking(null);
    setError("");
    setCopiedId(null);
  }, [open]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;

    const cleanName = teamName.trim();
    if (cleanName.length < 2) {
      setError("Give your team a name with at least 2 characters.");
      return;
    }

    setWorking("create");
    setError("");
    const created = await onCreate(cleanName);
    setWorking(null);

    if (created) {
      setTeamName("");
      onClose();
    } else {
      setError("Could not create the team. Please try again.");
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(cleanCode)) {
      setError("Enter the 8-character invite code from your team.");
      return;
    }

    setWorking("join");
    setError("");
    const joined = await onJoin(cleanCode);
    setWorking(null);

    if (joined) {
      setInviteCode("");
      onClose();
    } else {
      setError("That invite code didn’t work. Check it with your team and try again.");
    }
  }

  async function copyInvite(team: Team) {
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopiedId(team.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(`Copy didn’t work. The invite code is ${team.inviteCode}.`);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="team-dialog-title"
      className="team-dialog"
    >
      <div className="dialog-form">
        <div className="dialog-head">
          <div>
            <p className="section-kicker">Team workspace</p>
            <h2 id="team-dialog-title">Your teams</h2>
          </div>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close team dialog"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="dialog-body">
          <p className="team-intro">
            Personal tasks stay private. Team tasks are visible to every member,
            so everyone can follow progress together.
          </p>

          {teams.length > 0 ? (
            <ul className="team-list">
              {teams.map((team) => (
                <li
                  className={`team-row${activeTeamId === team.id ? " is-active" : ""}`}
                  key={team.id}
                >
                  <div className="team-row-main">
                    <span className="team-avatar" aria-hidden="true">
                      <Users />
                    </span>
                    <div className="team-row-copy">
                      <p className="team-row-name">
                        {team.name}
                        <span className={`team-role role-${team.role}`}>
                          {team.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </p>
                      <p className="team-row-meta">
                        {team.members.length} member
                        {team.members.length === 1 ? "" : "s"} ·{" "}
                        {team.members.map((member) => `@${member.username}`).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="team-row-actions">
                    <button
                      className="invite-chip"
                      type="button"
                      title={`Copy invite code ${team.inviteCode}`}
                      onClick={() => void copyInvite(team)}
                    >
                      {copiedId === team.id ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Copy aria-hidden="true" />
                      )}
                      <span>{copiedId === team.id ? "Copied" : team.inviteCode}</span>
                    </button>
                    <button
                      className="secondary-button team-open"
                      type="button"
                      onClick={() => {
                        onSelect(team.id);
                        onClose();
                      }}
                    >
                      {activeTeamId === team.id ? "Open" : "Switch"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="team-empty">
              You’re not in a team yet. Create one for your group, or join with an
              invite code.
            </p>
          )}

          <div className="team-forms">
            <form className="team-form" onSubmit={handleCreate}>
              <h3>
                <Plus aria-hidden="true" />
                Create a team
              </h3>
              <label className="stacked-field">
                <span>Team name</span>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="e.g. Design crew"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  disabled={working !== null}
                />
              </label>
              <button
                className="primary-button"
                type="submit"
                disabled={working !== null}
              >
                {working === "create" ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {working === "create" ? "Creating…" : "Create team"}
              </button>
            </form>

            <form className="team-form" onSubmit={handleJoin}>
              <h3>
                <KeyRound aria-hidden="true" />
                Join with a code
              </h3>
              <label className="stacked-field">
                <span>Invite code</span>
                <input
                  type="text"
                  className="invite-input"
                  maxLength={8}
                  placeholder="8-character code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={inviteCode}
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  disabled={working !== null}
                />
              </label>
              <button
                className="secondary-button"
                type="submit"
                disabled={working !== null}
              >
                {working === "join" ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                {working === "join" ? "Joining…" : "Join team"}
              </button>
            </form>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
