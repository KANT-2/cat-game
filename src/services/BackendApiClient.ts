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
  rewardCoins: number;
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
  coinsAwarded: number;
};

export type BackendGameCat = {
  catalogKey: string;
  owned: boolean;
  isHome: boolean;
  memories: string[];
};

export type BackendGameItem = {
  catalogKey: string;
  category: "FURNITURE" | "WALLPAPER" | "FLOOR";
  furnitureKind: string | null;
  ownedQuantity: number;
  availableQuantity: number;
};

export type BackendGamePlacement = {
  publicId: string;
  itemCatalogKey: string;
  x: number;
  y: number;
  rotation: 0 | 1;
};

type BackendDailyQuestId = "solve-one" | "solve-three" | "finish-code";

export type BackendGameSnapshot = {
  balance: number;
  mileage: number;
  activeCatKey: string;
  activeWallpaperKey: string | null;
  activeFloorKey: string | null;
  attendanceLastClaimDate: string;
  attendanceStreak: number;
  attendanceLongestStreak: number;
  attendanceClaimedDates: string[];
  dailyQuestDate: string;
  dailyCompletedTaskIds: string[];
  dailyHasCodeCompletion: boolean;
  claimedDailyQuestIds: BackendDailyQuestId[];
  dailyBonusClaimed: boolean;
  settings: {
    bgmEnabled: boolean;
    bgmVolume: number;
    effectsEnabled: boolean;
    effectsVolume: number;
    reducedMotion: boolean;
  };
  cats: BackendGameCat[];
  items: BackendGameItem[];
  placements: BackendGamePlacement[];
};

export type BackendGameMutation = {
  snapshot: BackendGameSnapshot;
  result: Record<string, unknown>;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type CsrfTokenProvider = () => string | null;

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
  private browserSession = false;

  constructor(
    private readonly baseUrl: string,
    userPublicId: string | null,
    private readonly fetcher: FetchLike = defaultFetch,
    private readonly requestTimeoutMs = 5_000,
    private readonly csrfTokenProvider: CsrfTokenProvider = readBrowserCsrfToken,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.userPublicId = userPublicId;
  }

  /** 기존 HttpOnly 브라우저 세션을 확인하고 사용자 프로필을 반환한다. */
  async connectBrowserSession(): Promise<BackendUser> {
    const health = asRecord(await this.request("/health", {}, false));
    if (health.status !== "ok") {
      throw new Error("Backend health response is invalid");
    }
    this.userPublicId = null;
    this.browserSession = true;
    try {
      return parseUser(await this.request("/api/v1/session/me"));
    } catch (error) {
      this.browserSession = false;
      throw error;
    }
  }

  /** 이메일과 비밀번호로 서버가 관리하는 브라우저 세션을 시작한다. */
  async login(email: string, password: string): Promise<BackendUser> {
    const user = parseUser(await this.jsonCommand("/api/v1/session/login", { email, password }, false));
    this.userPublicId = null;
    this.browserSession = true;
    return user;
  }

  /** 새 계정을 만들고 서버가 관리하는 브라우저 세션을 시작한다. */
  async register(email: string, username: string, password: string): Promise<BackendUser> {
    const user = parseUser(await this.jsonCommand("/api/v1/session/register", { email, username, password }, false));
    this.userPublicId = null;
    this.browserSession = true;
    return user;
  }

  /** 현재 브라우저 세션을 서버에서 폐기한다. */
  async logout(): Promise<void> {
    await this.request("/api/v1/session/logout", { method: "POST" });
    this.browserSession = false;
  }

  /** 서버 상태를 확인하고 필요하면 로컬 개발 세션을 발급한 뒤 사용자 프로필을 검증한다. */
  async connect(): Promise<BackendUser> {
    this.browserSession = false;
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

  /** 서버가 권위 있게 보관한 재화·고양이·인벤토리·배치 상태를 조회한다. */
  async getGameSnapshot(): Promise<BackendGameSnapshot> {
    return parseGameSnapshot(await this.request("/api/v1/game/snapshot"));
  }

  /** 멱등 요청 UUID로 상점 상품을 구매한다. */
  async buyGameItem(requestId: string, itemCatalogKey: string): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/shop/purchases", "POST", {
      request_id: requestId,
      item_catalog_key: itemCatalogKey,
      quantity: 1,
    });
  }

  /** 클라이언트가 생성한 공개 UUID를 사용해 가구를 한 번만 배치한다. */
  async placeGameFurniture(
    placementPublicId: string,
    itemCatalogKey: string,
    x: number,
    y: number,
    rotation: 0 | 1,
  ): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/placements", "POST", {
      placement_public_id: placementPublicId,
      item_catalog_key: itemCatalogKey,
      x,
      y,
      rotation,
    });
  }

  /** 기존 가구 배치를 새 격자 위치로 이동한다. */
  async moveGameFurniture(
    placementPublicId: string,
    x: number,
    y: number,
    rotation: 0 | 1,
  ): Promise<BackendGameMutation> {
    return this.gameMutation(`/api/v1/game/placements/${encodeURIComponent(placementPublicId)}`, "PATCH", {
      x,
      y,
      rotation,
    });
  }

  /** 배치 인스턴스를 제거하되 서버 인벤토리 소유권은 유지한다. */
  async removeGameFurniture(placementPublicId: string): Promise<BackendGameMutation> {
    return parseGameMutation(
      await this.request(`/api/v1/game/placements/${encodeURIComponent(placementPublicId)}`, { method: "DELETE" }),
    );
  }

  /** 보유한 벽지 또는 바닥 테마를 서버 상태에 적용한다. */
  async applyGameTheme(itemCatalogKey: string): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/themes", "POST", { item_catalog_key: itemCatalogKey });
  }

  /** 멱등 요청 UUID로 게임 보상 뽑기를 실행한다. */
  async drawGameGacha(requestId: string, drawCount: 1 | 11): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/gacha", "POST", {
      request_id: requestId,
      draw_count: drawCount,
    });
  }

  /** 보유 고양이를 활성 고양이로 선택한다. */
  async selectGameCat(catalogKey: string): Promise<BackendGameMutation> {
    return this.gameMutation(`/api/v1/game/cats/${encodeURIComponent(catalogKey)}/select`, "POST", {});
  }

  /** 보유 고양이의 야외 홈 표시 여부를 변경한다. */
  async setGameCatHome(catalogKey: string, visible: boolean): Promise<BackendGameMutation> {
    return this.gameMutation(`/api/v1/game/cats/${encodeURIComponent(catalogKey)}/home`, "PUT", { visible });
  }

  /** 사운드와 접근성 설정 일부를 서버 상태에 병합한다. */
  async updateGameSettings(patch: {
    bgmEnabled?: boolean;
    bgmVolume?: number;
    effectsEnabled?: boolean;
    effectsVolume?: number;
    reducedMotion?: boolean;
  }): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/settings", "PATCH", {
      bgm_enabled: patch.bgmEnabled,
      bgm_volume: patch.bgmVolume,
      effects_enabled: patch.effectsEnabled,
      effects_volume: patch.effectsVolume,
      reduced_motion: patch.reducedMotion,
    });
  }

  /** 서버 UTC 날짜를 기준으로 오늘 출석 보상을 요청한다. */
  async claimGameAttendance(): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/attendance/claims", "POST", {});
  }

  /** 서버가 계산한 오늘의 학습 진행도를 기준으로 퀘스트 보상을 요청한다. */
  async claimGameDailyReward(rewardKey: BackendDailyQuestId | "bonus"): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/daily-rewards/claims", "POST", { reward_key: rewardKey });
  }

  /** 학습 이력만 초기화하고 이미 지급된 재화와 보유 자산은 유지한다. */
  async resetGameLearning(): Promise<BackendGameMutation> {
    return this.gameMutation("/api/v1/game/learning/reset", "POST", {});
  }

  /** 인증 사용자가 보유한 모든 고양이의 서버 기억을 삭제한다. */
  async clearGameCatMemories(): Promise<BackendGameMutation> {
    return parseGameMutation(await this.request("/api/v1/game/cat-memories", { method: "DELETE" }));
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
      if (this.userPublicId) {
        headers.set("X-User-Public-ID", this.userPublicId);
      } else if (this.browserSession) {
        const method = init.method ?? "GET";
        if (!isSafeMethod(method)) {
          const csrfToken = this.csrfTokenProvider();
          if (!csrfToken) {
            throw new Error("Browser session CSRF token is unavailable");
          }
          headers.set("X-CSRF-Token", csrfToken);
        }
      } else {
        throw new Error("Backend user session is not connected");
      }
    }
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
        credentials: "include",
      });
      if (!response.ok) {
        throw new BackendApiError(response.status, await readErrorMessage(response));
      }
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  private async gameMutation(
    path: string,
    method: "PATCH" | "POST" | "PUT",
    payload: Record<string, unknown>,
  ): Promise<BackendGameMutation> {
    return parseGameMutation(
      await this.request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  }

  private async jsonCommand(path: string, payload: Record<string, unknown>, authenticated: boolean): Promise<unknown> {
    return this.request(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      authenticated,
    );
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
    rewardCoins: readNumber(record, "reward_coins"),
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
    coinsAwarded: readNumber(record, "coins_awarded"),
  };
}

function parseGameMutation(value: unknown): BackendGameMutation {
  const record = asRecord(value);
  return {
    snapshot: parseGameSnapshot(record.snapshot),
    result: asRecord(record.result),
  };
}

function parseGameSnapshot(value: unknown): BackendGameSnapshot {
  const record = asRecord(value);
  const settings = asRecord(record.settings);
  const cats = readArray(record, "cats").map((entry) => {
    const cat = asRecord(entry);
    return {
      catalogKey: readString(cat, "catalog_key"),
      owned: readBoolean(cat, "owned"),
      isHome: readBoolean(cat, "is_home"),
      memories: readStringArray(cat, "memories"),
    };
  });
  const items = readArray(record, "items").map((entry) => {
    const item = asRecord(entry);
    return {
      catalogKey: readString(item, "catalog_key"),
      category: readEnum(item, "category", ["FURNITURE", "WALLPAPER", "FLOOR"] as const),
      furnitureKind: readNullableString(item, "furniture_kind"),
      ownedQuantity: readNumber(item, "owned_quantity"),
      availableQuantity: readNumber(item, "available_quantity"),
    };
  });
  const placements = readArray(record, "placements").map((entry) => {
    const placement = asRecord(entry);
    return {
      publicId: readString(placement, "public_id"),
      itemCatalogKey: readString(placement, "item_catalog_key"),
      x: readNumber(placement, "x"),
      y: readNumber(placement, "y"),
      rotation: readNumberEnum(placement, "rotation", [0, 1] as const),
    };
  });
  return {
    balance: readNumber(record, "balance"),
    mileage: readNumber(record, "mileage"),
    activeCatKey: readString(record, "active_cat_key"),
    activeWallpaperKey: readNullableString(record, "active_wallpaper_key"),
    activeFloorKey: readNullableString(record, "active_floor_key"),
    attendanceLastClaimDate: readString(record, "attendance_last_claim_date"),
    attendanceStreak: readNumber(record, "attendance_streak"),
    attendanceLongestStreak: readNumber(record, "attendance_longest_streak"),
    attendanceClaimedDates: readArray(record, "attendance_claimed_dates").map((entry) => {
      if (typeof entry !== "string") {
        throw new Error("Backend attendance date is invalid");
      }
      return entry;
    }),
    dailyQuestDate: readString(record, "daily_quest_date"),
    dailyCompletedTaskIds: readStringArray(record, "daily_completed_task_ids"),
    dailyHasCodeCompletion: readBoolean(record, "daily_has_code_completion"),
    claimedDailyQuestIds: readStringEnumArray(record, "claimed_daily_quest_ids", [
      "solve-one",
      "solve-three",
      "finish-code",
    ] as const),
    dailyBonusClaimed: readBoolean(record, "daily_bonus_claimed"),
    settings: {
      bgmEnabled: readBoolean(settings, "bgm_enabled"),
      bgmVolume: readNumber(settings, "bgm_volume"),
      effectsEnabled: readBoolean(settings, "effects_enabled"),
      effectsVolume: readNumber(settings, "effects_volume"),
      reducedMotion: readBoolean(settings, "reduced_motion"),
    },
    cats,
    items,
    placements,
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

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Backend field ${key} is not an array`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  return readArray(record, key).map((value) => {
    if (typeof value !== "string") {
      throw new Error(`Backend field ${key} contains a non-string value`);
    }
    return value;
  });
}

function readStringEnumArray<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number][] {
  return readStringArray(record, key).map((value) => {
    if (!allowed.includes(value as T[number])) {
      throw new Error(`Backend field ${key} contains an unsupported value`);
    }
    return value as T[number];
  });
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

function readNumberEnum<const T extends readonly number[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] {
  const value = readNumber(record, key);
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

function isSafeMethod(method: string): boolean {
  const normalizedMethod = method.toUpperCase();
  return normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS";
}

function readBrowserCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  for (const part of document.cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "nyang_csrf") {
      return decodeURIComponent(value.join("="));
    }
  }
  return null;
}
