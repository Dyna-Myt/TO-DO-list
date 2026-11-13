import type { Priority } from "../types";
import { dateInputForOffset } from "./dates";

export interface TaskSuggestion {
  category?: string;
  priority?: Priority;
  date?: string;
  label: string;
}

const categoryRules: Array<{ pattern: RegExp; category: string }> = [
  {
    pattern: /\b(bug|code|deploy|release|api|sprint|refactor|test|pr|pull request|software)\b/,
    category: "Software Engineering",
  },
  {
    pattern: /\b(design|figma|mockup|wireframe|ui|ux|prototype)s?\b/,
    category: "Design",
  },
  {
    pattern: /\b(campaign|launch|social|content|blog|marketing|seo)s?\b/,
    category: "Marketing",
  },
  {
    pattern: /\b(invoice|budget|report|hire|onboard|ops|operations|expense)s?\b/,
    category: "Operations",
  },
  {
    pattern: /\b(research|study|read|analy[sz]e|explore|learn)(ing|ed|es|s)?\b/,
    category: "Research",
  },
  {
    pattern: /\b(email|reply|message|slack|newsletter|update the team)s?\b/,
    category: "Communication",
  },
  {
    pattern:
      /\b(gym|workout|exercise|jog|walk|hike|yoga|meditat|doctor|dentist|therapy|medicine|vitamin|birthday|personal)(ing|ed|es|s)?\b/,
    category: "Personal",
  },
  {
    pattern: /\b(meeting|call|sync|standup|stand-up|review|interview|demo)s?\b/,
    category: "Meetings",
  },
  {
    pattern:
      /\b(dust|vacuum|mop|sweep|scrub|clean|tidy|declutter|organi[sz]e|laundry|wash|fold|iron|dish|kitchen|bathroom|toilet|bed|bedsheet|wardrobe|closet|fridge|refrigerator|oven|window|trash|garbage|recycl|garden|plant|mow|lawn|repair|fix)(ping|ped|bing|bed|ing|ed|es|s)?\b/,
    category: "Home",
  },
  {
    pattern:
      /\b(grocer|shopping|supermarket|market|pharmacy|prescription|bank|post office|parcel|pick ?up|drop ?off|dry clean|petrol|fuel|errand|appointment|renew|licen[cs]e|return|deliver)(ing|ed|es|s|ies)?\b/,
    category: "Errands",
  },
];

/**
 * A tiny, entirely local "smart add" helper. It never sends task text
 * anywhere; it just looks for a few useful words while you type.
 */
export function suggestTask(title: string, now = new Date()): TaskSuggestion | null {
  const text = title.toLocaleLowerCase();
  if (text.trim().length < 3) return null;

  const parts: string[] = [];
  const suggestion: TaskSuggestion = { label: "" };

  const category = categoryRules.find((rule) => rule.pattern.test(text));
  if (category) {
    suggestion.category = category.category;
    parts.push(category.category);
  }

  if (/\b(urgent|asap|critical|important|blocker)\b/.test(text)) {
    suggestion.priority = "high";
    parts.push("High priority");
  } else if (/\b(low priority|someday|later)\b/.test(text)) {
    suggestion.priority = "low";
    parts.push("Low priority");
  }

  if (/\btoday\b/.test(text)) {
    suggestion.date = dateInputForOffset(0, now);
    parts.push("Today");
  } else if (/\btomorrow\b/.test(text)) {
    suggestion.date = dateInputForOffset(1, now);
    parts.push("Tomorrow");
  } else if (/\bnext week\b/.test(text)) {
    suggestion.date = dateInputForOffset(7, now);
    parts.push("Next week");
  }

  if (!parts.length) return null;
  suggestion.label = parts.join(" · ");
  return suggestion;
}
