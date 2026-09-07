import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const apiUrl = (process.env.CAT_GAME_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const gameUrl = process.env.GAME_URL ?? "http://127.0.0.1:4173/";
const screenshotPath = process.env.CAT_GAME_INTEGRATION_SCREENSHOT ?? join(tmpdir(), "cat-game-integration.png");
const browserEmail = `integration-${Date.now()}@example.com`;
const browserPassword = "integration-pass-2026";

await verifyProductionShellHeaders(gameUrl);

const session = await requestJson(`${apiUrl}/api/v1/session/development`, { method: "POST" });
const userPublicId = readString(session, "public_id");
const authHeaders = { "X-User-Public-ID": userPublicId };
const reset = asRecord(
  await requestJson(`${apiUrl}/api/v1/game/learning/reset`, {
    method: "POST",
    headers: authHeaders,
  }),
);
const initialGame = asRecord(reset.snapshot);
const initialBalance = readNumber(initialGame, "balance");
const initialStateVersion = readNumber(initialGame, "state_version");
const purchaseRequestId = crypto.randomUUID();
const purchasePayload = {
  request_id: purchaseRequestId,
  item_catalog_key: "floor.star",
  quantity: 1,
};
const purchase = asRecord(
  await requestJson(`${apiUrl}/api/v1/game/shop/purchases`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(purchasePayload),
  }),
);
const purchaseReplay = asRecord(
  await requestJson(`${apiUrl}/api/v1/game/shop/purchases`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(purchasePayload),
  }),
);
const purchasedBalance = readNumber(asRecord(purchase.snapshot), "balance");
const replayBalance = readNumber(asRecord(purchaseReplay.snapshot), "balance");
const purchaseStateVersion = readNumber(asRecord(purchase.snapshot), "state_version");
const replayStateVersion = readNumber(asRecord(purchaseReplay.snapshot), "state_version");
if (purchasedBalance !== initialBalance - 65 || replayBalance !== purchasedBalance) {
  throw new Error("backend purchase was not charged exactly once");
}
if (purchaseStateVersion <= initialStateVersion || replayStateVersion !== purchaseStateVersion) {
  throw new Error("backend state version did not preserve idempotent command ordering");
}
const settingsMutation = asRecord(
  await requestJson(`${apiUrl}/api/v1/game/settings`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ effects_volume: 73 }),
  }),
);
if (readNumber(asRecord(asRecord(settingsMutation.snapshot).settings), "effects_volume") !== 73) {
  throw new Error("backend settings mutation did not persist");
}
if (readNumber(asRecord(settingsMutation.snapshot), "state_version") <= purchaseStateVersion) {
  throw new Error("backend state version did not advance after settings mutation");
}
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
let tolerateOfflineErrors = false;
let tolerateAuth401 = false;
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("response", (response) => {
  const responseUrl = new URL(response.url());
  const browserOrigin = new URL(gameUrl).origin;
  if (
    responseUrl.origin === browserOrigin &&
    (responseUrl.pathname === "/health" || responseUrl.pathname.startsWith("/api/"))
  ) {
    backendResponses.push({ url: response.url(), status: response.status() });
  }
});

try {
  const anonymousSessionResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/me") && response.status() === 401,
  );
  await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await anonymousSessionResponse;
  await page.waitForTimeout(400);
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (tolerateOfflineErrors && (text.includes("ERR_INTERNET_DISCONNECTED") || text.includes("service worker"))) {
        return;
      }
      if (tolerateAuth401 && text.includes("401")) {
        return;
      }
      errors.push(`console: ${text}`);
    }
  });
  const registrationResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/register") && response.status() === 201,
  );
  const firstSnapshotResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/game/snapshot") && response.status() === 200,
  );
  await page.mouse.click(900, 380);
  await page.mouse.click(700, 490);
  await page.keyboard.type(browserEmail);
  await page.keyboard.press("Tab");
  await page.keyboard.type(browserPassword);
  await page.keyboard.press("Enter");
  await Promise.all([registrationResponse, firstSnapshotResponse]);
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === "ready", undefined, {
    timeout: 120_000,
  });
  await page.evaluate(() => navigator.serviceWorker.ready);
  const attendanceResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/game/attendance/claims") && response.status() === 200,
  );
  await page.mouse.click(1220, 733);
  await attendanceResponse;
  const resumedSessionResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/me") && response.status() === 200,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await resumedSessionResponse;
  const controlledByServiceWorker = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  if (!controlledByServiceWorker) {
    throw new Error("service worker does not control the reloaded app");
  }
  await page.waitForTimeout(4_000);
  await page.mouse.click(1220, 733);

  tolerateOfflineErrors = true;
  await page.context().setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.waitForTimeout(150);
  const reconnectSnapshot = page.waitForResponse(
    (response) => response.url().includes("/api/v1/game/snapshot") && response.status() === 200,
  );
  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await reconnectSnapshot;
  await page.waitForTimeout(500);
  tolerateOfflineErrors = false;

  await page.mouse.click(90, 90);
  await page.waitForTimeout(200);
  await page.mouse.click(520, 738);
  await page.waitForTimeout(150);
  const logoutResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/logout") && response.status() === 204,
  );
  const anonymousAfterLogout = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/me") && response.status() === 401,
  );
  tolerateAuth401 = true;
  await page.mouse.click(950, 585);
  await logoutResponse;
  await anonymousAfterLogout;
  await page.waitForTimeout(500);

  const rejectedLoginResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/login") && response.status() === 401,
  );
  await page.mouse.click(700, 490);
  await page.keyboard.type(browserEmail);
  await page.keyboard.press("Tab");
  await page.keyboard.type("incorrect-password");
  await page.keyboard.press("Enter");
  await rejectedLoginResponse;

  const loginResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/login") && response.status() === 200,
  );
  const loginSnapshotResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/game/snapshot") && response.status() === 200,
  );
  await page.keyboard.type(browserPassword);
  await page.keyboard.press("Enter");
  await Promise.all([loginResponse, loginSnapshotResponse]);
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === "ready", undefined, {
    timeout: 120_000,
  });
  tolerateAuth401 = false;

  await page.mouse.click(90, 90);
  await page.waitForTimeout(200);
  await page.mouse.click(520, 738);
  await page.waitForTimeout(150);
  const secondLogoutResponse = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/logout") && response.status() === 204,
  );
  const anonymousAfterSecondLogout = page.waitForResponse(
    (response) => response.url().includes("/api/v1/session/me") && response.status() === 401,
  );
  tolerateAuth401 = true;
  await page.mouse.click(950, 585);
  await secondLogoutResponse;
  await anonymousAfterSecondLogout;
  await page.waitForTimeout(500);

  tolerateOfflineErrors = true;
  await page.context().setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("canvas").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === "error");
  await page.screenshot({ path: screenshotPath });
} finally {
  await browser.close();
}

for (const path of [
  "/health",
  "/api/v1/session/register",
  "/api/v1/session/login",
  "/api/v1/session/me",
  "/api/v1/session/logout",
  "/learning/recommendations",
  "/api/v1/game/snapshot",
  "/api/v1/game/attendance/claims",
]) {
  const succeeded = backendResponses.some(
    (entry) => entry.url.includes(path) && entry.status >= 200 && entry.status < 300,
  );
  if (!succeeded) {
    errors.push(`missing successful browser backend response: ${path}`);
  }
}
if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log(
  `Integration smoke passed: production shell headers and offline PWA reload, browser registration/invalid login/login/session/reconnect/logout, CSRF, API quiz and sandbox grading, ${backendResponses.length} browser API responses, screenshot ${screenshotPath}`,
);

async function verifyProductionShellHeaders(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`frontend shell returned ${response.status}`);
  }
  const requiredHeaders = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  for (const [name, expected] of Object.entries(requiredHeaders)) {
    const value = response.headers.get(name);
    if (!value?.includes(expected)) {
      throw new Error(`frontend shell header ${name} is missing ${expected}`);
    }
  }
}

async function findTask(headers, predicate, description) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
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

function readNumber(record, key) {
  const value = asRecord(record)[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`expected number field ${key}`);
  }
  return value;
}
