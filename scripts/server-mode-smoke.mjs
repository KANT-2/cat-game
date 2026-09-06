import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const gameUrl = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
const apiUrl = (process.env.CAT_GAME_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const screenshotPath = join(tmpdir(), "cat-game-server-mode.png");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
const successfulApiPaths = new Set();
let startupAuthenticationProbePending = true;

page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("console", (message) => {
  if (message.type() !== "error") {
    return;
  }
  if (startupAuthenticationProbePending && message.text().includes("401")) {
    startupAuthenticationProbePending = false;
    return;
  }
  errors.push(`console: ${message.text()}`);
});
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.origin === new URL(apiUrl).origin && response.ok()) {
    successfulApiPaths.add(url.pathname);
  }
});

try {
  const developmentSessionResponse = page.waitForResponse(
    (response) => response.url() === `${apiUrl}/api/v1/session/development` && response.status() === 200,
  );
  await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").waitFor({ state: "visible" });
  const user = await (await developmentSessionResponse).json();
  const userPublicId = readString(user, "public_id");
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === "ready", undefined, {
    timeout: 120_000,
  });

  const grading = await page.evaluate(
    async ({ backendUrl, publicId }) => {
      const headers = { "X-User-Public-ID": publicId };
      const requestJson = async (path, init = {}) => {
        const response = await fetch(`${backendUrl}${path}`, {
          ...init,
          headers: { Accept: "application/json", ...headers, ...init.headers },
        });
        if (!response.ok) {
          throw new Error(`${path} returned ${response.status}`);
        }
        return response.json();
      };
      const tasks = await requestJson("/api/v1/learning/recommendations?limit=50");
      const quiz = tasks.find((task) => task.type === "MULTIPLE_CHOICE");
      const code = tasks.find((task) => task.type === "CODE" && task.title.includes("두 수의 합"));
      if (!quiz || !code) {
        throw new Error("seeded quiz or Python code task is missing");
      }
      const submitAndWait = async (payload) => {
        const accepted = await requestJson("/api/v1/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, context_type: "LEARNING", used_hint: false }),
        });
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          const attempt = await requestJson(`/api/v1/attempts/${accepted.public_id}`);
          if (attempt.status === "COMPLETED" || attempt.status === "FAILED") {
            return attempt;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error("grading timed out");
      };
      return {
        quiz: await submitAndWait({ task_public_id: quiz.public_id, selected_option: "A" }),
        code: await submitAndWait({
          task_public_id: code.public_id,
          submitted_code: "a, b = map(int, input().split())\nprint(a + b)\n",
        }),
      };
    },
    { backendUrl: apiUrl, publicId: userPublicId },
  );

  if (grading.quiz.status !== "COMPLETED" || grading.quiz.is_correct !== true) {
    throw new Error(`browser quiz grading failed: ${JSON.stringify(grading.quiz)}`);
  }
  if (grading.code.status !== "COMPLETED" || grading.code.is_correct !== true) {
    throw new Error(`browser code grading failed: ${JSON.stringify(grading.code)}`);
  }
  for (const requiredPath of [
    "/health",
    "/api/v1/session/development",
    "/api/v1/session/me",
    "/api/v1/learning/recommendations",
    "/api/v1/game/snapshot",
    "/api/v1/attempts",
  ]) {
    if (!successfulApiPaths.has(requiredPath)) {
      throw new Error(`browser did not complete backend request: ${requiredPath}`);
    }
  }

  await page.mouse.click(1194, 820);
  await page.waitForTimeout(300);
  await page.screenshot({ path: screenshotPath });
} finally {
  await browser.close();
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Server-mode E2E passed: browser session, snapshot, recommendations, quiz and Docker grading");
console.log(`screenshot: ${screenshotPath}`);

function readString(record, key) {
  const value = record?.[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`response field ${key} is invalid`);
  }
  return value;
}
