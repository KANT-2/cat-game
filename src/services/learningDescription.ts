import { message } from "../content/messages";

/**
 * Normalize the legacy story heading for all remote learning views.
 * @param description - Server-authored task text, including legacy seed content.
 * @returns Display text with one request heading and unchanged problem instructions.
 */
export function learningDescription(description: string): string {
  if (!description.includes("[고양이 이야기]")) {
    return description;
  }
  return description
    .replace(/\[도와주세요!\]/g, message("study.problemHeading"))
    .replace(/\[고양이 이야기\]/g, message("study.helpHeading"));
}

/**
 * Return the problem sentence used by recommendation and task cards without a repeated section label.
 * @param description - Server-authored task text containing story and problem sections.
 * @returns The problem section with its bracketed heading removed, or the first useful section.
 */
export function learningCardSummary(description: string): string {
  const sections = learningDescription(description)
    .split(/\r?\n\s*\r?\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
  const problem = sections.find((section) => section.startsWith("[문제]"));
  const fallback = sections.find((section) => !section.startsWith("[오늘의 냥이 임무]")) ?? sections[0] ?? "";
  return (problem ?? fallback).replace(/^\[[^\]]+\]\s*/, "").trim();
}
