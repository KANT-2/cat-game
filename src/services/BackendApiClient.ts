export type BackendUser = {
  publicId: string;
  username: string;
  balance: number;
};

export type BackendLearningTask = {
  publicId: string;
  conceptName: string;
  title: string;
  type: "CODE" | "MULTIPLE_CHOICE";
  domain: "PYTHON" | "SQL";
  difficulty: "BRONZE" | "SILVER" | "GOLD";
  description: string;
  templateCode: string;
  options: Record<string, string> | null;
  hintText: string | null;
  completed: boolean;
};

export type BackendAttemptSubmission = {
  taskPublicId: string;
  submittedCode?: string;
  selectedOption?: string;
  usedHint: boolean;
};

export type BackendAttempt = {
  publicId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  correct: boolean | null;
  resultDetail: string | null;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class BackendApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

/** FastAPI의 공개 JSON 계약과 인증 헤더만 소유하는 HTTP 전송 어댑터다. */
export class BackendApiClient {
  private userPublicId: string | null;

  constructor(
    private readonly baseUrl: string,
    userPublicId: string | null,
    private readonly fetcher: FetchLike = defaultFetch,
    private readonly requestTimeoutMs = 5_000,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.userPublicId = userPublicId;
  }

  /** 서버 상태를 확인하고 필요하면 로컬 개발 세션을 발급한 뒤 사용자 프로필을 검증한다. */
  async connect(): Promise<BackendUser> {
    const health = asRecord(await this.request("/health", {}, false));
    if (health.status !== "ok") {
      throw new Error("Backend health response is invalid");
    }
    if (!this.userPublicId) {
      const session = asRecord(await this.request("/api/v1/session/development", { method: "POST" }, false));
      this.userPublicId = readString(session, "public_id");
    }
    return parseUser(await this.request("/api/v1/session/me"));
  }

  /** 인증 사용자의 추천 학습 과제를 서버 순서대로 조회한다. */
  async getLearningRecommendations(limit = 10): Promise<BackendLearningTask[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const payload = await this.request(`/api/v1/learning/recommendations?limit=${safeLimit}`);
    if (!Array.isArray(payload)) {
      throw new Error("Backend recommendations response is invalid");
    }
    return payload.map(parseTask);
  }

  /** 학습 답안을 서버 채점 큐에 제출하고 완료 또는 실패 상태까지 폴링한다. */
  async grade(submission: BackendAttemptSubmission, waitTimeoutMs = 20_000): Promise<BackendAttempt> {
    const payload = {
      task_public_id: submission.taskPublicId,
      submitted_code: submission.submittedCode,
      selected_option: submission.selectedOption,
      context_type: "LEARNING",
      used_hint: submission.usedHint,
    };
    const accepted = asRecord(
      await this.request("/api/v1/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    const attemptPublicId = readString(accepted, "public_id");
    const deadline = Date.now() + waitTimeoutMs;
    while (Date.now() < deadline) {
      const attempt = parseAttempt(await this.request(`/api/v1/attempts/${encodeURIComponent(attemptPublicId)}`));
      if (attempt.status === "COMPLETED" || attempt.status === "FAILED") {
        return attempt;
      }
      await delay(250);
    }
    throw new Error("Backend grading timed out");
  }

  private async request(path: string, init: RequestInit = {}, authenticated = true): Promise<unknown> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.requestTimeoutMs);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (authenticated) {
      if (!this.userPublicId) {
        throw new Error("Backend user session is not connected");
      }
      headers.set("X-User-Public-ID", this.userPublicId);
    }
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers, signal: controller.signal });
      if (!response.ok) {
        throw new BackendApiError(response.status, await readErrorMessage(response));
      }
      return await response.json();
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}

function parseUser(value: unknown): BackendUser {
  const record = asRecord(value);
  return {
    publicId: readString(record, "public_id"),
    username: readString(record, "username"),
    balance: readNumber(record, "balance"),
  };
}

function parseTask(value: unknown): BackendLearningTask {
  const record = asRecord(value);
  const type = readEnum(record, "type", ["CODE", "MULTIPLE_CHOICE"] as const);
  const domain = readEnum(record, "domain", ["PYTHON", "SQL"] as const);
  const difficulty = readEnum(record, "difficulty", ["BRONZE", "SILVER", "GOLD"] as const);
  const rawOptions = record.options;
  let options: Record<string, string> | null = null;
  if (rawOptions !== null) {
    const optionRecord = asRecord(rawOptions);
    options = Object.fromEntries(
      Object.entries(optionRecord).map(([key, option]) => {
        if (typeof option !== "string") {
          throw new Error("Backend task option is invalid");
        }
        return [key, option];
      }),
    );
  }
  return {
    publicId: readString(record, "public_id"),
    conceptName: readString(record, "concept_name"),
    title: readString(record, "title"),
    type,
    domain,
    difficulty,
    description: readString(record, "description"),
    templateCode: readString(record, "template_code"),
    options,
    hintText: readNullableString(record, "hint_text"),
    completed: readBoolean(record, "completed"),
  };
}

function parseAttempt(value: unknown): BackendAttempt {
  const record = asRecord(value);
  return {
    publicId: readString(record, "public_id"),
    status: readEnum(record, "status", ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const),
    correct: readNullableBoolean(record, "is_correct"),
    resultDetail: readNullableString(record, "result_detail"),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Backend response is not a JSON object");
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Backend field ${key} is not a string`);
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  return readString(record, key);
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Backend field ${key} is not a number`);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`Backend field ${key} is not a boolean`);
  }
  return value;
}

function readNullableBoolean(record: Record<string, unknown>, key: string): boolean | null {
  if (record[key] === null) {
    return null;
  }
  return readBoolean(record, key);
}

function readEnum<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] {
  const value = readString(record, key);
  if (!allowed.includes(value as T[number])) {
    throw new Error(`Backend field ${key} has an unsupported value`);
  }
  return value as T[number];
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = asRecord(await response.json());
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // The HTTP status remains actionable when an intermediary returns a non-JSON body.
  }
  return response.statusText || `Backend request failed with status ${response.status}`;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function defaultFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}
