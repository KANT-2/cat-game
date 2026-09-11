import { readFile } from "node:fs/promises";

const [command, taskPublicIdOrFile, updateFile] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(command ? 0 : 1);
}

const apiKey = process.env.TASKS_API_KEY?.trim();
if (!apiKey) {
  fail("TASKS_API_KEY 환경변수를 설정해 주세요.");
}

const baseUrl = (process.env.CAT_GAME_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const request = await buildRequest(command, taskPublicIdOrFile, updateFile);
const response = await fetch(`${baseUrl}${request.path}`, {
  method: request.method,
  headers: {
    Accept: "application/json",
    "X-API-Key": apiKey,
    ...(request.body ? { "Content-Type": "application/json" } : {}),
  },
  body: request.body ? JSON.stringify(request.body) : undefined,
});

if (!response.ok) {
  const detail = await readResponse(response);
  fail(`요청 실패 (${response.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

if (response.status === 204) {
  console.log("문제를 비활성화했습니다.");
} else {
  console.log(JSON.stringify(await response.json(), null, 2));
}

async function buildRequest(action, firstArgument, secondArgument) {
  if (action === "create" && firstArgument && !secondArgument) {
    return { method: "POST", path: "/api/v1/tasks", body: await readPayload(firstArgument) };
  }
  if (action === "update" && firstArgument && secondArgument) {
    return {
      method: "PATCH",
      path: `/api/v1/tasks/${encodeURIComponent(firstArgument)}`,
      body: await readPayload(secondArgument),
    };
  }
  if (action === "delete" && firstArgument && !secondArgument) {
    return { method: "DELETE", path: `/api/v1/tasks/${encodeURIComponent(firstArgument)}` };
  }
  printUsage();
  fail("명령과 인수를 확인해 주세요.");
}

async function readPayload(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`JSON 파일을 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readResponse(response) {
  try {
    const body = await response.json();
    return body.detail ?? body;
  } catch {
    return response.statusText;
  }
}

function printUsage() {
  console.log(`사용법:
  npm run tasks:manage -- create <task.json>
  npm run tasks:manage -- update <task-public-id> <changes.json>
  npm run tasks:manage -- delete <task-public-id>`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
