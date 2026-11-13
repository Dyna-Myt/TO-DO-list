import type { BrandConfig } from "../types";

/**
 * White-label defaults.
 *
 * These values seed the app and are also restored by the "Reset to defaults"
 * button in the in-app brand settings.
 */
export const defaultBrand: BrandConfig = {
  name: "Taskflow",
  logoText: "✓",
  accent: "#2d56d2",
  tagline: "Make room for what matters.",
  description:
    "A calm workspace for your tasks, deadlines, and everything you've already crossed off.",
};

export const accentPresets = [
  "#2d56d2",
  "#1e3ea8",
  "#4b6fe0",
  "#cbc5ad",
  "#8a5a2c",
  "#a83e28",
  "#d5a052",
  "#4a6d7a",
];
