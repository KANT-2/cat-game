import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const apiUrl = (process.env.CAT_GAME_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const gameUrl = process.env.GAME_URL ?? "http://127.0.0.1:4173/";
const screenshotPath = process.env.CAT_GAME_INTEGRATION_SCREENSHOT ?? join(tmpdir(), "cat-game-integration.png");

const session = await requestJson(`${apiUrl}/api/v1/session/development`, { method: "POST" });
const userPublicId = readString(session, "public_id");
const authHeaders = { "X-User-Public-ID": userPublicId };
const quiz = await findTask(authHeaders, (task) => task.type === "MULTIPLE_CHOICE", "multiple-choice task");
const accepted = await requestJson(`${apiUrl}/api/v1/attempts`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify({
    task_public_id: readString(quiz, "public_id"),
    selected_option: "A",
    context_type: "LEARNING",
    used_hint: false,
  }),
});
const attempt = await waitForAttempt(readString(accepted, "public_id"), authHeaders);
if (attempt.status !== "COMPLETED" || attempt.is_correct !== true) {
  throw new Error(`backend grading did not complete correctly: ${JSON.stringify(attempt)}`);
}

const codeTask = await findTask(
  authHeaders,
  (task) => task.type === "CODE" && typeof task.title === "string" && task.title.includes("두 수의 합"),
  "sum code task",
);
const codeAccepted = await requestJson(`${apiUrl}/api/v1/attempts`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify({
    task_public_id: readString(codeTask, "public_id"),
    submitted_code: "a, b = map(int, input().split())\nprint(a + b)\n",
    context_type: "LEARNING",
    used_hint: false,
  }),
});
const codeAttempt = await waitForAttempt(readString(codeAccepted, "public_id"), authHeaders);
if (codeAttempt.status !== "COMPLETED" || codeAttempt.is_correct !== true) {
  throw new Error(`sandbox grading did not complete correctly: ${JSON.stringify(codeAttempt)}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
const backendResponses = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("response", (response) => {
  if (response.url().startsWith(apiUrl)) {
    backendResponses.push({ url: response.url(), status: response.status() });
  }
});

try {
  await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await page.waitForTimeout(5_000);
  await page.mouse.click(1194, 820);
  await page.waitForTimeout(500);
  await page.screenshot({ path: screenshotPath });
} finally {
  await browser.close();
}

for (const path of ["/health", "/api/v1/session/development", "/api/v1/session/me", "/learning/recommendations"]) {
  const response = backendResponses.find((entry) => entry.url.includes(path));
  if (!response || response.status < 200 || response.status >= 300) {
    errors.push(`missing successful browser backend response: ${path}`);
  }
}
if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log(
  `Integration smoke passed: API quiz and sandbox code grading, ${backendResponses.length} browser API responses, screenshot ${screenshotPath}`,
);

async function findTask(headers, predicate, description) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tasks = await requestJson(`${apiUrl}/api/v1/learning/recommendations?limit=50`, { headers });
    if (!Array.isArray(tasks)) {
      throw new Error("recommendations response is not an array");
    }
    const task = tasks.map(asRecord).find(predicate);
    if (task) {
      return task;
    }
  }
  throw new Error(`no ${description} was available`);
}

async function waitForAttempt(publicId, headers) {
  for (let poll = 0; poll < 40; poll += 1) {
    const attempt = asRecord(
      await requestJson(`${apiUrl}/api/v1/attempts/${encodeURIComponent(publicId)}`, { headers }),
    );
    if (attempt.status === "COMPLETED" || attempt.status === "FAILED") {
      return attempt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("backend grading timed out");
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...init.headers } });
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected a JSON object");
  }
  return value;
}

function readString(record, key) {
  const value = asRecord(record)[key];
  if (typeof value !== "string") {
    throw new Error(`expected string field ${key}`);
  }
  return value;
}
