import { Check, LoaderCircle, Palette, RotateCcw, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { accentPresets, defaultBrand } from "../config/brand";
import { readableInk } from "../lib/brand";
import type { BrandConfig } from "../types";
import { Modal } from "./Modal";

interface BrandSettingsDialogProps {
  open: boolean;
  brand: BrandConfig;
  onClose: () => void;
  onSave: (brand: BrandConfig) => Promise<boolean>;
}

export function BrandSettingsDialog({
  open,
  brand,
  onClose,
  onSave,
}: BrandSettingsDialogProps) {
  const [draft, setDraft] = useState<BrandConfig>(brand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft({ ...brand });
    setSaving(false);
    setError("");
  }, [brand, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = draft.name.trim();
    const logoText = draft.logoText.trim();
    const tagline = draft.tagline.trim();
    const description = draft.description.trim();

    if (!name || !logoText || !tagline || !description) {
      setError("Please complete all brand fields.");
      return;
    }

    setSaving(true);
    const saved = await onSave({
      ...draft,
      name,
      logoText,
      tagline,
      description,
    });
    setSaving(false);

    if (saved) onClose();
  }

  function update<K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="brand-settings-title"
      className="settings-dialog"
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-head">
          <div>
            <p className="section-kicker">White-label setup</p>
            <h2 id="brand-settings-title">Brand settings</h2>
          </div>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Close brand settings"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="dialog-body">
          <div className="brand-preview">
            <span
              className="brand-mark brand-mark-preview"
              style={{
                background: draft.accent,
                color: readableInk(draft.accent),
              }}
              aria-hidden="true"
            >
              {draft.logoText || "✓"}
            </span>
            <div>
              <strong>{draft.name || "Your app"}</strong>
              <span>Live brand preview</span>
            </div>
            <Palette aria-hidden="true" />
          </div>

          <div className="dialog-grid">
            <label className="stacked-field">
              <span>App name</span>
              <input
                type="text"
                maxLength={40}
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </label>
            <label className="stacked-field">
              <span>Logo text</span>
              <input
                type="text"
                maxLength={3}
                value={draft.logoText}
                onChange={(event) => update("logoText", event.target.value)}
                placeholder="✓"
                required
              />
            </label>
          </div>

          <div className="accent-field">
            <span className="stacked-label">Accent color</span>
            <div className="accent-row">
              <label className="color-picker">
                <input
                  type="color"
                  value={draft.accent}
                  onChange={(event) => update("accent", event.target.value)}
                  aria-label="Choose a custom accent color"
                />
                <span>{draft.accent.toUpperCase()}</span>
              </label>
              <div className="swatches" aria-label="Accent color presets">
                {accentPresets.map((color) => (
                  <button
                    key={color}
                    className={`swatch${
                      draft.accent.toLowerCase() === color.toLowerCase()
                        ? " is-selected"
                        : ""
                    }`}
                    type="button"
                    style={{ background: color, color: readableInk(color) }}
                    aria-label={`Use accent color ${color}`}
                    aria-pressed={draft.accent.toLowerCase() === color.toLowerCase()}
                    onClick={() => update("accent", color)}
                  >
                    {draft.accent.toLowerCase() === color.toLowerCase() ? (
                      <Check aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="stacked-field">
            <span>Tagline</span>
            <input
              type="text"
              maxLength={120}
              value={draft.tagline}
              onChange={(event) => update("tagline", event.target.value)}
              required
            />
          </label>

          <label className="stacked-field">
            <span>Description</span>
            <textarea
              rows={3}
              maxLength={220}
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="settings-note">
            Branding is saved to the local SQLite database and applies to every
            browser using this Taskflow server.
          </p>
        </div>

        <div className="dialog-actions settings-actions">
          <button
            className="text-button reset-brand"
            type="button"
            onClick={() => setDraft({ ...defaultBrand })}
            disabled={saving}
          >
            <RotateCcw aria-hidden="true" />
            Reset to defaults
          </button>
          <div className="dialog-actions-group">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : null}
              {saving ? "Saving…" : "Save brand"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
