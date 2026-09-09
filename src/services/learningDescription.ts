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
