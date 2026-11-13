import { defaultBrand } from "../config/brand";
import type { BrandConfig } from "../types";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().slice(0, maxLength);
  return clean || fallback;
}

export function normalizeBrand(value: unknown): BrandConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultBrand };
  }

  const candidate = value as Partial<BrandConfig>;

  return {
    name: cleanText(candidate.name, defaultBrand.name, 40),
    logoText: cleanText(candidate.logoText, defaultBrand.logoText, 3),
    accent:
      typeof candidate.accent === "string" && HEX_COLOR.test(candidate.accent)
        ? candidate.accent.toLowerCase()
        : defaultBrand.accent,
    tagline: cleanText(candidate.tagline, defaultBrand.tagline, 120),
    description: cleanText(candidate.description, defaultBrand.description, 220),
  };
}

function channelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const value = hex.replace("#", "");
  const red = channelToLinear(Number.parseInt(value.slice(0, 2), 16));
  const green = channelToLinear(Number.parseInt(value.slice(2, 4), 16));
  const blue = channelToLinear(Number.parseInt(value.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick white or deep ink for text that sits on the chosen accent color. */
export function readableInk(accent: string) {
  const whiteContrast = contrastRatio(accent, "#ffffff");
  const inkContrast = contrastRatio(accent, "#1a1b16");
  return whiteContrast >= inkContrast ? "#ffffff" : "#1a1b16";
}

export function splitTagline(tagline: string) {
  const words = tagline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lead: "", accent: "" };
  if (words.length === 1) return { lead: "", accent: words[0] };

  const accentCount = Math.min(2, words.length - 1);
  return {
    lead: words.slice(0, -accentCount).join(" "),
    accent: words.slice(-accentCount).join(" "),
  };
}
