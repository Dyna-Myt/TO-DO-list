import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Priority, Task } from "../types";
import { taskCategories } from "../config/views";
import { toIsoFromLocalInput, toLocalInputValue } from "../lib/dates";
import { DeadlineCheck } from "./DeadlineCheck";
import { Modal } from "./Modal";

interface EditTaskDialogProps {
  task: Task | null;
  onClose: () => void;
  onSave: (
    id: string,
    draft: {
      title: string;
      notes: string;
      category: string;
      deadline: string | null;
      priority: Priority;
      progress: number;
    },
  ) => Promise<boolean>;
}

export function EditTaskDialog({ task, onClose, onSave }: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("General");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes);
    setCategory(task.category);
    setDeadline(toLocalInputValue(task.deadline));
    setPriority(task.priority);
    setProgress(task.progress);
    setError("");
    setSaving(false);
  }, [task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;
    setError("");

    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const deadlineIso = toIsoFromLocalInput(deadline);
    if (deadline && !deadlineIso) {
      setError("That deadline does not look right. Please choose it again.");
      return;
    }

    setSaving(true);
    const saved = await onSave(task.id, {
      title: cleanTitle,
      notes: notes.trim(),
      category,
      deadline: deadlineIso,
      priority,
      progress,
    });
    setSaving(false);

    if (saved) onClose();
  }

  const progressHint =
    progress === 100
      ? "Saving at 100% marks this task complete."
      : progress === 0
        ? "Not started yet."
        : "Everyone in the team sees this progress.";

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      labelledBy="edit-dialog-title"
      className="edit-dialog"
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-head">
          <div>
            <p className="section-kicker">
              {task?.teamId ? "Shared team task" : "Personal task"}
            </p>
            <h2 id="edit-dialog-title">Edit task</h2>
          </div>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close edit dialog"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="dialog-body">
          <label className="stacked-field">
            <span>Task</span>
            <input
              type="text"
              maxLength={140}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="stacked-field">
            <span>
              Note <em>optional</em>
            </span>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Add a little context"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className="dialog-grid">
            <label className="stacked-field">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {taskCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="stacked-field">
              <span>Deadline</span>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </label>
            <label className="stacked-field">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                <option value="high">High</option>
                <option value="medium">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <DeadlineCheck
            title={title}
            deadlineIso={toIsoFromLocalInput(deadline)}
            onApplyDeadline={(isoDate) => {
              const time = deadline ? deadline.slice(11, 16) : "17:00";
              setDeadline(`${isoDate}T${time}`);
            }}
          />

          <div className="progress-field">
            <div className="progress-field-head">
              <span>Completion</span>
              <strong>{progress}%</strong>
            </div>
            <input
              className="progress-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              aria-label="Completion percentage"
              aria-valuetext={`${progress}% complete`}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
            <div className="task-progress-track dialog-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <small className="field-hint">{progressHint}</small>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
