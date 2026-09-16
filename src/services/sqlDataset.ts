import type { SqlDatasetTable } from "../core/GameClient";

/** Parse the deliberately public SQL setup script into compact learner-facing table previews. */
export function parseSqlDataset(setupSql: string): SqlDatasetTable[] {
  const tables: SqlDatasetTable[] = [];
  for (const match of setupSql.matchAll(/CREATE\s+TABLE\s+([A-Za-z_][\w]*)\s*\(([^;]+)\)\s*;/gi)) {
    const name = match[1];
    const columns = splitSqlList(match[2]).map((definition) => definition.trim().split(/\s+/, 1)[0]);
    const valuesMatch = new RegExp(`INSERT\\s+INTO\\s+${escapeRegExp(name)}\\s+VALUES\\s*([\\s\\S]*?);`, "i").exec(
      setupSql,
    );
    const seriesMatch = new RegExp(
      `INSERT\\s+INTO\\s+${escapeRegExp(name)}\\s+SELECT\\s+generate_series\\(([-\\d]+)\\s*,\\s*([-\\d]+)\\)`,
      "i",
    ).exec(setupSql);
    const generatedRows = seriesMatch ? generateSeriesPreview(seriesMatch[1], seriesMatch[2]) : [];
    tables.push({
      name,
      columns,
      rows: valuesMatch ? parseValueRows(valuesMatch[1]) : generatedRows,
      rowSummary: seriesMatch ? `${seriesMatch[1]} … ${seriesMatch[2]}` : undefined,
    });
  }
  return tables;
}

function generateSeriesPreview(startValue: string, endValue: string): string[][] {
  const start = Number(startValue);
  const end = Number(endValue);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return [];
  }
  const step = start <= end ? 1 : -1;
  const count = Math.min(2, Math.abs(end - start) + 1);
  return Array.from({ length: count }, (_, index) => [String(start + index * step)]);
}

function parseValueRows(value: string): string[][] {
  const rows: string[][] = [];
  let depth = 0;
  let quoted = false;
  let start = -1;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'") {
      if (quoted && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (quoted) {
      continue;
    }
    if (character === "(") {
      if (depth === 0) {
        start = index + 1;
      }
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        rows.push(splitSqlList(value.slice(start, index)).map(formatSqlValue));
        start = -1;
      }
    }
  }
  return rows;
}

function splitSqlList(value: string): string[] {
  const parts: string[] = [];
  let quoted = false;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'") {
      if (quoted && value[index + 1] === "'") {
        index += 1;
        continue;
      }
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function formatSqlValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed.toUpperCase() === "NULL" ? "NULL" : trimmed;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
