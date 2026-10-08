import {
  COOKIE_NAME_ACCESS_TOKEN,
  COOKIE_NAME_CODE_VERIFIER,
} from "./const";

/**
 * セッション切れ後の遷移を一度だけ行うためのフラグ
 * 複数 API が同時に 401 を返しても、ログイン後画面への再読み込みを繰り返さない
 */
let loginRedirectStarted = false;

/**
 * ブラウザへログイン遷移を依頼するときの依存
 */
export interface LoginRedirectController {
  /**
   * 現在のページ URL
   */
  href: string;

  /**
   * 現在のオリジン
   */
  origin: string;

  /**
   * Cookie を設定または削除する
   * @param {string} value Set-Cookie 相当の文字列
   */
  setCookie: (value: string) => void;

  /**
   * ページ遷移を行う
   * @param {string} url 遷移先
   */
  replace: (url: string) => void;

  /**
   * 遷移処理を遅延実行する
   * 省略時は同期的に実行する
   * @param {() => void} callback 遷移処理
   */
  schedule?: (callback: () => void) => void;
}

/**
 * テスト間で遷移フラグを初期化する
 */
export function resetLoginRedirectForTests(): void {
  loginRedirectStarted = false;
}

/**
 * 期限切れ Cookie を削除する Set-Cookie 文字列を生成する
 * Lambda@Edge が付与する Path / Secure / SameSite と揃えないと削除できない
 * @param {unknown} name Cookie 名
 * @returns {string} 削除用の Cookie 文字列
 * @throws {TypeError} Cookie 名が文字列でない場合
 * @throws {Error} Cookie 名が空、または認証用 Cookie 以外の場合
 */
export function buildExpiredCookie(name: unknown): string {
  if (typeof name !== "string") {
    throw new TypeError("Cookie name must be a string");
  }
  if (name.trim() === "") {
    throw new Error("Cookie name is required");
  }
  if (
    name !== COOKIE_NAME_ACCESS_TOKEN &&
    name !== COOKIE_NAME_CODE_VERIFIER
  ) {
    throw new Error("Cookie name is not allowed");
  }
  return `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
}

/**
 * オリジンをログイン遷移用に正規化する
 * @param {unknown} origin オリジン
 * @returns {string} 末尾スラッシュを除いたオリジン。不正な場合は空文字
 */
export function normalizeOrigin(origin: unknown): string {
  if (typeof origin !== "string") {
    return "";
  }
  return origin.trim().replace(/\/+$/, "");
}

/**
 * Lambda@Edge のログアウト処理を起動する URL を生成する
 * ログアウト後の logout_uri は `/` であり、Cookie が無ければ Edge がログイン画面へ送る
 * @param {unknown} origin オリジン
 * @returns {string} `/?logout=true` を付けた URL
 */
export function buildLogoutRedirectUrl(origin: unknown): string {
  const normalized = normalizeOrigin(origin);
  if (normalized === "") {
    return "/?logout=true";
  }
  return `${normalized}/?logout=true`;
}

/**
 * すでにログアウトリダイレクト中の URL かどうかを判定する
 * 同じ画面への再遷移による無限リダイレクトを避ける
 * @param {unknown} href 現在の URL
 * @returns {boolean} `logout=true` の場合は true
 */
export function isLogoutNavigation(href: unknown): boolean {
  if (typeof href !== "string" || href.trim() === "") {
    return false;
  }
  try {
    const url = new URL(href, "https://placeholder.local");
    return url.searchParams.get("logout") === "true";
  } catch {
    return false;
  }
}

/**
 * 認証用 Cookie を削除する
 * 片方の削除に失敗しても、もう片方と後続の画面遷移は継続する
 * @param {(value: string) => void} setCookie Cookie 設定関数
 */
function clearAuthCookies(setCookie: (value: string) => void): void {
  for (const name of [COOKIE_NAME_ACCESS_TOKEN, COOKIE_NAME_CODE_VERIFIER]) {
    try {
      setCookie(buildExpiredCookie(name));
    } catch (error) {
      console.error("Failed to clear auth cookie", error);
    }
  }
}

/**
 * セッション切れ時に、ログイン後画面を再表示せずログイン画面へ遷移する
 * @param {LoginRedirectController} controller ブラウザ操作
 * @throws {TypeError} controller が不正な場合、または画面遷移に失敗した場合
 */
export function startLoginRedirect(controller: LoginRedirectController): void {
  if (controller === null || typeof controller !== "object") {
    throw new TypeError("Login redirect controller is required");
  }
  if (
    typeof controller.replace !== "function" ||
    typeof controller.setCookie !== "function"
  ) {
    throw new TypeError("Login redirect controller is invalid");
  }
  if (loginRedirectStarted) {
    return;
  }
  if (isLogoutNavigation(controller.href)) {
    return;
  }

  loginRedirectStarted = true;
  const run = (): void => {
    clearAuthCookies(controller.setCookie);
    try {
      controller.replace(buildLogoutRedirectUrl(controller.origin));
    } catch (error) {
      loginRedirectStarted = false;
      throw error;
    }
  };

  try {
    if (typeof controller.schedule === "function") {
      controller.schedule(run);
      return;
    }
    run();
  } catch (error) {
    loginRedirectStarted = false;
    throw error;
  }
}

/**
 * セッション切れを検知したブラウザをログイン画面へ遷移させる
 * 同一オリジンの `/` へ戻ると、期限切れセッションのままログイン後画面が再読み込みされ続ける
 */
export function redirectToLoginPage(): void {
  startLoginRedirect({
    href: window.location.href,
    origin: window.location.origin,
    setCookie: (value: string): void => {
      document.cookie = value;
    },
    replace: (url: string): void => {
      window.location.replace(url);
    },
    schedule: (callback: () => void): void => {
      queueMicrotask(() => {
        try {
          callback();
        } catch (error) {
          console.error("Failed to redirect to login page", error);
        }
      });
    },
  });
}
