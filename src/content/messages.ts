import ko from "./ko.json";

/** `ko.json`에 실제로 존재하는 사용자 메시지 키의 합집합이다. */
export type MessageId = keyof typeof ko;

/** 메시지 템플릿의 명명된 자리표시자에 넣을 값이다. */
export type MessageParams = Record<string, string | number>;

/**
 * 한국어 JSON 카탈로그에서 사용자 문구를 읽고 명명된 자리표시자를 치환한다.
 *
 * @param id - `ko.json`에 존재하는 메시지 키. TypeScript가 존재 여부를 정적으로 검사한다.
 * @param params - `{name}` 형태의 자리표시자에 넣을 문자열 또는 숫자 값.
 * @returns 전달된 값을 문자열로 변환해 치환한 최종 사용자 문구.
 *
 * @remarks 전달하지 않은 자리표시자는 누락을 발견할 수 있도록 원래 `{name}` 형태로 남긴다.
 *
 * @example
 * ```ts
 * message("furniture.placed", { item: message("furniture.bed") });
 * ```
 */
export function message(id: MessageId, params: MessageParams = {}): string {
  return ko[id].replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
