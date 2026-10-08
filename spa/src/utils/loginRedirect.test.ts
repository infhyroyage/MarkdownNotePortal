import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  COOKIE_NAME_ACCESS_TOKEN,
  COOKIE_NAME_CODE_VERIFIER,
} from "./const.ts";
import {
  buildExpiredCookie,
  buildLogoutRedirectUrl,
  isLogoutNavigation,
  normalizeOrigin,
  redirectToLoginPage,
  resetLoginRedirectForTests,
  startLoginRedirect,
  type LoginRedirectController,
} from "./loginRedirect.ts";

/**
 * テスト観点表
 *
 * | Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
 * |---|---|---|---|---|
 * | TC-N-01 | 有効な origin と href | Equivalence – normal | 認証 Cookie を Max-Age=0 で削除し `/?logout=true` へ replace する | ログイン後画面 `/` には戻さない |
 * | TC-N-02 | schedule がコールバックを遅延する | Equivalence – normal | schedule 実行前は遷移しない | - |
 * | TC-N-03 | origin の末尾スラッシュ | Equivalence – normal | スラッシュを除いてから `/?logout=true` を付ける | location.origin は通常スラッシュを含まない |
 * | TC-N-04 | redirectToLoginPage が queueMicrotask 経由で遷移する | Equivalence – normal | microtask 実行時に Cookie 削除と replace が行われる | - |
 * | TC-A-01 | 2 回目の startLoginRedirect | Equivalence – abnormal | 2 回目は replace しない | 同時 401 の多重遷移を防ぐ |
 * | TC-A-02 | href が既に logout=true | Equivalence – abnormal | replace も Cookie 削除もしない | 同一 URL の再読み込みループを防ぐ |
 * | TC-A-03 | setCookie が例外を投げる | Equivalence – external failure | 例外を飲み、replace は実行する | 削除失敗でもログイン画面へ離れる |
 * | TC-A-04 | replace が Error を投げる | Equivalence – external failure | メッセージを維持して再送出し、フラグを戻して再試行できる | - |
 * | TC-A-05 | schedule が Error を投げる | Equivalence – external failure | メッセージを維持して再送出し、フラグを戻す | - |
 * | TC-A-06 | redirectToLoginPage の遷移が失敗する | Equivalence – external failure | console.error で捕捉し、再試行できる | queueMicrotask 内の未処理例外を避ける |
 * | TC-A-07 | controller が null / 関数不足 | Equivalence – invalid type | TypeError とメッセージを検証する | - |
 * | TC-A-08 | Cookie 名が null / 数値 / 空 / 未知 | Equivalence – invalid type | TypeError または Error とメッセージを検証する | - |
 * | TC-A-09 | href が logout=false / 大文字 / 壊れた URL | Equivalence – abnormal | ログアウト中とみなさない | Edge は `logout=true` のみ扱う |
 * | TC-B-01 | origin が null / 0 / 空 / 空白 | Boundary – NULL / 0 / empty | 相対 URL `/?logout=true` | 数値 0 はオリジンとして意味を持たない |
 * | TC-B-02 | origin 長 1 / 末尾スラッシュのみ | Boundary – min | 空でなければ保持、スラッシュのみは相対 URL | - |
 * | TC-B-03 | origin のホスト長 252 / 253 / 254 | Boundary – max / ±1 | 切り詰めずに URL に含める | DNS 上限はここでは検証しない |
 * | TC-B-04 | Cookie 名の ±1 文字 / 空白のみ | Boundary – ±1 / empty | 許可しない | Max-Age の ±1 は入力ではない。削除境界は Max-Age=0 |
 * | TC-B-05 | logout 値の ±1 文字 (`tru` / `truee`) | Boundary – ±1 | ログアウト中とみなさない | - |
 * | TC-B-06 | schedule に数値 0 を渡す | Boundary – 0 | 関数ではないため同期実行する | - |
 */

const LOGOUT_URL = "https://app.example/?logout=true";
const EXPIRED_ACCESS_TOKEN_COOKIE = `${COOKIE_NAME_ACCESS_TOKEN}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
const EXPIRED_CODE_VERIFIER_COOKIE = `${COOKIE_NAME_CODE_VERIFIER}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;

interface RedirectSpy {
  cookies: string[];
  urls: string[];
  controller: LoginRedirectController;
  scheduled: Array<() => void>;
}

/**
 * 遷移先と Cookie 削除を記録するコントローラを作る
 * @param {Partial<LoginRedirectController>} overrides 上書きする操作
 * @returns {RedirectSpy} 記録とコントローラ
 */
function createSpy(
  overrides: Partial<LoginRedirectController> = {},
): RedirectSpy {
  const cookies: string[] = [];
  const urls: string[] = [];
  const scheduled: Array<() => void> = [];
  const controller: LoginRedirectController = {
    href: "https://app.example/",
    origin: "https://app.example",
    setCookie: (value: string): void => {
      cookies.push(value);
    },
    replace: (url: string): void => {
      urls.push(url);
    },
    ...overrides,
  };
  return { cookies, urls, controller, scheduled };
}

describe("buildExpiredCookie", () => {
  // Given: アクセストークン Cookie 名
  // When: 削除用文字列を生成する
  // Then: Max-Age=0 かつ Path=/ Secure SameSite=Lax
  it("TC-N-01: アクセストークン Cookie を Max-Age=0 で削除する", () => {
    assert.equal(
      buildExpiredCookie(COOKIE_NAME_ACCESS_TOKEN),
      EXPIRED_ACCESS_TOKEN_COOKIE,
    );
    assert.match(EXPIRED_ACCESS_TOKEN_COOKIE, /Max-Age=0/);
    assert.doesNotMatch(EXPIRED_ACCESS_TOKEN_COOKIE, /Max-Age=-1|Max-Age=1/);
  });

  // Given: code_verifier Cookie 名
  // When: 削除用文字列を生成する
  // Then: 同じ属性で削除する
  it("TC-N-02: code_verifier Cookie を削除する", () => {
    assert.equal(
      buildExpiredCookie(COOKIE_NAME_CODE_VERIFIER),
      EXPIRED_CODE_VERIFIER_COOKIE,
    );
  });

  // Given: null
  // When: 削除用文字列を生成する
  // Then: TypeError
  it("TC-A-01: Cookie 名が null のとき TypeError", () => {
    assert.throws(() => buildExpiredCookie(null), {
      name: "TypeError",
      message: "Cookie name must be a string",
    });
  });

  // Given: undefined
  // When: 削除用文字列を生成する
  // Then: TypeError
  it("TC-A-02: Cookie 名が undefined のとき TypeError", () => {
    assert.throws(() => buildExpiredCookie(undefined), {
      name: "TypeError",
      message: "Cookie name must be a string",
    });
  });

  // Given: 数値 0
  // When: 削除用文字列を生成する
  // Then: TypeError。0 は Cookie 名として意味を持たない
  it("TC-B-01: Cookie 名が 0 のとき TypeError", () => {
    assert.throws(() => buildExpiredCookie(0), {
      name: "TypeError",
      message: "Cookie name must be a string",
    });
  });

  // Given: 空文字
  // When: 削除用文字列を生成する
  // Then: Error
  it("TC-B-02: Cookie 名が空のとき Error", () => {
    assert.throws(() => buildExpiredCookie(""), {
      name: "Error",
      message: "Cookie name is required",
    });
  });

  // Given: 空白のみ
  // When: 削除用文字列を生成する
  // Then: Error
  it("TC-B-03: Cookie 名が空白のみのとき Error", () => {
    assert.throws(() => buildExpiredCookie("   "), {
      name: "Error",
      message: "Cookie name is required",
    });
  });

  // Given: 許可された名前の 1 文字不足
  // When: 削除用文字列を生成する
  // Then: Error
  it("TC-B-04: Cookie 名が許可名より 1 文字短いとき Error", () => {
    assert.throws(
      () => buildExpiredCookie(COOKIE_NAME_ACCESS_TOKEN.slice(0, -1)),
      {
        name: "Error",
        message: "Cookie name is not allowed",
      },
    );
  });

  // Given: 許可された名前の 1 文字超過
  // When: 削除用文字列を生成する
  // Then: Error
  it("TC-B-05: Cookie 名が許可名より 1 文字長いとき Error", () => {
    assert.throws(() => buildExpiredCookie(`${COOKIE_NAME_ACCESS_TOKEN}x`), {
      name: "Error",
      message: "Cookie name is not allowed",
    });
  });

  // Given: 長さ 1 の未知の名前
  // When: 削除用文字列を生成する
  // Then: Error
  it("TC-B-06: Cookie 名が 1 文字のとき Error", () => {
    assert.throws(() => buildExpiredCookie("a"), {
      name: "Error",
      message: "Cookie name is not allowed",
    });
  });

  // Given: 非常に長い未知の名前
  // When: 削除用文字列を生成する
  // Then: Error。Cookie 名の上限は許可リストで制限する
  it("TC-B-07: Cookie 名が 254 文字のとき Error", () => {
    assert.throws(() => buildExpiredCookie("a".repeat(254)), {
      name: "Error",
      message: "Cookie name is not allowed",
    });
  });
});

describe("normalizeOrigin / buildLogoutRedirectUrl", () => {
  // Given: 末尾スラッシュのないオリジン
  // When: ログアウト URL を生成する
  // Then: origin/?logout=true
  it("TC-N-01: オリジンに logout=true を付ける", () => {
    assert.equal(
      buildLogoutRedirectUrl("https://app.example"),
      "https://app.example/?logout=true",
    );
  });

  // Given: 末尾スラッシュ付きオリジン
  // When: ログアウト URL を生成する
  // Then: スラッシュを重ねない
  it("TC-N-02: 末尾スラッシュを除く", () => {
    assert.equal(normalizeOrigin("https://app.example///"), "https://app.example");
    assert.equal(
      buildLogoutRedirectUrl("https://app.example/"),
      "https://app.example/?logout=true",
    );
  });

  // Given: null
  // When: ログアウト URL を生成する
  // Then: 相対 URL
  it("TC-B-01: origin が null のとき相対 URL", () => {
    assert.equal(normalizeOrigin(null), "");
    assert.equal(buildLogoutRedirectUrl(null), "/?logout=true");
  });

  // Given: 数値 0
  // When: ログアウト URL を生成する
  // Then: 相対 URL
  it("TC-B-02: origin が 0 のとき相対 URL", () => {
    assert.equal(buildLogoutRedirectUrl(0), "/?logout=true");
  });

  // Given: 空文字と空白
  // When: ログアウト URL を生成する
  // Then: 相対 URL
  it("TC-B-03: origin が空または空白のとき相対 URL", () => {
    assert.equal(buildLogoutRedirectUrl(""), "/?logout=true");
    assert.equal(buildLogoutRedirectUrl("   "), "/?logout=true");
    assert.equal(buildLogoutRedirectUrl("///"), "/?logout=true");
  });

  // Given: 長さ 1 のオリジン
  // When: ログアウト URL を生成する
  // Then: 切り詰めない
  it("TC-B-04: origin が 1 文字のとき保持する", () => {
    assert.equal(buildLogoutRedirectUrl("a"), "a/?logout=true");
  });

  // Given: ホスト長 252 / 253 / 254
  // When: ログアウト URL を生成する
  // Then: いずれも切り詰めない
  it("TC-B-05: origin の長さ 252・253・254 を保持する", () => {
    for (const length of [252, 253, 254]) {
      const origin = `https://${"a".repeat(length)}`;
      assert.equal(buildLogoutRedirectUrl(origin), `${origin}/?logout=true`);
    }
  });

  // Given: オブジェクト
  // When: 正規化する
  // Then: 空文字
  it("TC-A-01: origin がオブジェクトのとき空文字", () => {
    assert.equal(normalizeOrigin({}), "");
    assert.equal(buildLogoutRedirectUrl({}), "/?logout=true");
  });
});

describe("isLogoutNavigation", () => {
  // Given: logout=true
  // When: 判定する
  // Then: true
  it("TC-N-01: logout=true をログアウト中と判定する", () => {
    assert.equal(isLogoutNavigation("https://app.example/?logout=true"), true);
    assert.equal(
      isLogoutNavigation("https://app.example/memo?foo=1&logout=true"),
      true,
    );
    assert.equal(isLogoutNavigation("/?logout=true"), true);
  });

  // Given: 通常のログイン後 URL
  // When: 判定する
  // Then: false
  it("TC-N-02: ログインクエリがない URL は false", () => {
    assert.equal(isLogoutNavigation("https://app.example/"), false);
    assert.equal(isLogoutNavigation("https://app.example/#logout=true"), false);
  });

  // Given: null / 空 / 0
  // When: 判定する
  // Then: false
  it("TC-B-01: null・空・0 は false", () => {
    assert.equal(isLogoutNavigation(null), false);
    assert.equal(isLogoutNavigation(undefined), false);
    assert.equal(isLogoutNavigation(""), false);
    assert.equal(isLogoutNavigation("   "), false);
    assert.equal(isLogoutNavigation(0), false);
  });

  // Given: logout 値が true の前後 1 文字
  // When: 判定する
  // Then: false
  it("TC-B-02: logout 値が true の ±1 文字のとき false", () => {
    assert.equal(isLogoutNavigation("https://app.example/?logout=tru"), false);
    assert.equal(isLogoutNavigation("https://app.example/?logout=truee"), false);
    assert.equal(isLogoutNavigation("https://app.example/?logout="), false);
    assert.equal(isLogoutNavigation("https://app.example/?logout=false"), false);
    assert.equal(isLogoutNavigation("https://app.example/?logout=TRUE"), false);
  });

  // Given: URL として解釈できない文字列
  // When: 判定する
  // Then: false
  it("TC-A-01: 壊れた URL のとき false", () => {
    assert.equal(isLogoutNavigation("http://["), false);
  });
});

describe("startLoginRedirect", () => {
  const consoleErrors: unknown[][] = [];
  const originalConsoleError = console.error;

  beforeEach(() => {
    resetLoginRedirectForTests();
    consoleErrors.length = 0;
    console.error = (...args: unknown[]): void => {
      consoleErrors.push(args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    resetLoginRedirectForTests();
  });

  // Given: ログイン後画面にいる
  // When: セッション切れでログイン遷移を開始する
  // Then: Cookie を削除しログアウト URL へ replace する
  it("TC-N-01: 認証 Cookie を削除してログアウト URL へ遷移する", () => {
    const spy = createSpy();

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.cookies, [
      EXPIRED_ACCESS_TOKEN_COOKIE,
      EXPIRED_CODE_VERIFIER_COOKIE,
    ]);
    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });

  // Given: schedule がコールバックを保持する
  // When: ログイン遷移を開始する
  // Then: 実行前は遷移せず、実行後に遷移する
  it("TC-N-02: schedule 実行まで遷移しない", () => {
    const spy = createSpy({
      schedule: (callback: () => void): void => {
        spy.scheduled.push(callback);
      },
    });

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, []);
    assert.deepEqual(spy.cookies, []);
    assert.equal(spy.scheduled.length, 1);

    spy.scheduled[0]();

    assert.deepEqual(spy.urls, [LOGOUT_URL]);
    assert.equal(spy.cookies.length, 2);
  });

  // Given: すでに遷移を開始済み
  // When: もう一度開始する
  // Then: 2 回目は replace しない
  it("TC-A-01: 2 回目の遷移は行わない", () => {
    const spy = createSpy();

    startLoginRedirect(spy.controller);
    startLoginRedirect(spy.controller);

    assert.equal(spy.urls.length, 1);
  });

  // Given: schedule 前にもう一度呼ばれる
  // When: 遅延中に再入する
  // Then: schedule は 1 回だけ
  it("TC-A-02: 遅延中の再入では schedule しない", () => {
    const spy = createSpy({
      schedule: (callback: () => void): void => {
        spy.scheduled.push(callback);
      },
    });

    startLoginRedirect(spy.controller);
    startLoginRedirect(spy.controller);

    assert.equal(spy.scheduled.length, 1);
  });

  // Given: すでに logout=true
  // When: ログイン遷移を開始する
  // Then: 同じ URL を再読み込みしない
  it("TC-A-03: logout=true の画面では再遷移しない", () => {
    const spy = createSpy({ href: LOGOUT_URL });

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, []);
    assert.deepEqual(spy.cookies, []);
  });

  // Given: ログアウト URL では遷移しない
  // When: その後に通常 URL で開始する
  // Then: 通常 URL からは遷移できる
  it("TC-A-04: logout=true で中断しても次の通常 URL からは遷移できる", () => {
    const skipped = createSpy({ href: LOGOUT_URL });
    startLoginRedirect(skipped.controller);

    const spy = createSpy();
    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });

  // Given: setCookie が毎回失敗する
  // When: ログイン遷移を開始する
  // Then: 例外を出さず replace する
  it("TC-A-05: Cookie 削除が失敗しても遷移する", () => {
    const spy = createSpy({
      setCookie: (): void => {
        throw new Error("cookie jar full");
      },
    });

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, [LOGOUT_URL]);
    assert.equal(consoleErrors.length, 2);
    assert.equal(consoleErrors[0][0], "Failed to clear auth cookie");
    assert.ok(consoleErrors[0][1] instanceof Error);
    assert.equal((consoleErrors[0][1] as Error).message, "cookie jar full");
  });

  // Given: 1 つ目の Cookie 削除だけ失敗する
  // When: ログイン遷移を開始する
  // Then: 2 つ目は削除し、遷移する
  it("TC-A-06: 片方の Cookie 削除失敗後も残りを削除して遷移する", () => {
    const cookies: string[] = [];
    let attempts = 0;
    const spy = createSpy({
      setCookie: (value: string): void => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError("first cookie failed");
        }
        cookies.push(value);
      },
    });

    startLoginRedirect(spy.controller);

    assert.deepEqual(cookies, [EXPIRED_CODE_VERIFIER_COOKIE]);
    assert.deepEqual(spy.urls, [LOGOUT_URL]);
    assert.equal((consoleErrors[0][1] as Error).message, "first cookie failed");
  });

  // Given: replace が失敗する
  // When: ログイン遷移を開始し、失敗後に再試行する
  // Then: 例外メッセージを維持し、再試行できる
  it("TC-A-07: 遷移失敗時は例外を再送出し再試行できる", () => {
    const failing = createSpy({
      replace: (): void => {
        throw new Error("Navigation blocked");
      },
    });

    assert.throws(() => startLoginRedirect(failing.controller), {
      name: "Error",
      message: "Navigation blocked",
    });

    const spy = createSpy();
    startLoginRedirect(spy.controller);
    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });

  // Given: schedule が失敗する
  // When: ログイン遷移を開始し、失敗後に再試行する
  // Then: 例外メッセージを維持し、再試行できる
  it("TC-A-08: schedule 失敗時は例外を再送出し再試行できる", () => {
    const failing = createSpy({
      schedule: (): void => {
        throw new Error("schedule failed");
      },
    });

    assert.throws(() => startLoginRedirect(failing.controller), {
      name: "Error",
      message: "schedule failed",
    });

    const spy = createSpy();
    startLoginRedirect(spy.controller);
    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });

  // Given: controller が null
  // When: ログイン遷移を開始する
  // Then: TypeError
  it("TC-A-09: controller が null のとき TypeError", () => {
    assert.throws(() => startLoginRedirect(null as unknown as LoginRedirectController), {
      name: "TypeError",
      message: "Login redirect controller is required",
    });
  });

  // Given: controller が undefined
  // When: ログイン遷移を開始する
  // Then: TypeError
  it("TC-A-10: controller が undefined のとき TypeError", () => {
    assert.throws(
      () => startLoginRedirect(undefined as unknown as LoginRedirectController),
      {
        name: "TypeError",
        message: "Login redirect controller is required",
      },
    );
  });

  // Given: replace が関数でない
  // When: ログイン遷移を開始する
  // Then: TypeError
  it("TC-A-11: replace が関数でないとき TypeError", () => {
    const spy = createSpy();
    const invalid = {
      ...spy.controller,
      replace: "replace",
    } as unknown as LoginRedirectController;

    assert.throws(() => startLoginRedirect(invalid), {
      name: "TypeError",
      message: "Login redirect controller is invalid",
    });
  });

  // Given: setCookie が null
  // When: ログイン遷移を開始する
  // Then: TypeError
  it("TC-A-12: setCookie が null のとき TypeError", () => {
    const spy = createSpy();
    const invalid = {
      ...spy.controller,
      setCookie: null,
    } as unknown as LoginRedirectController;

    assert.throws(() => startLoginRedirect(invalid), {
      name: "TypeError",
      message: "Login redirect controller is invalid",
    });
  });

  // Given: origin が空
  // When: ログイン遷移を開始する
  // Then: 相対のログアウト URL へ遷移する
  it("TC-B-01: origin が空のとき相対 URL へ遷移する", () => {
    const spy = createSpy({ origin: "" });

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, ["/?logout=true"]);
  });

  // Given: origin が null 相当で型だけ崩れている
  // When: ログイン遷移を開始する
  // Then: 相対 URL へ遷移する
  it("TC-B-02: origin が null のとき相対 URL へ遷移する", () => {
    const spy = createSpy();
    const controller = {
      ...spy.controller,
      origin: null,
    } as unknown as LoginRedirectController;

    startLoginRedirect(controller);

    assert.deepEqual(spy.urls, ["/?logout=true"]);
  });

  // Given: schedule に数値 0 を渡す
  // When: ログイン遷移を開始する
  // Then: 同期的に遷移する
  it("TC-B-03: schedule が 0 のとき同期実行する", () => {
    const spy = createSpy();
    const controller = {
      ...spy.controller,
      schedule: 0,
    } as unknown as LoginRedirectController;

    startLoginRedirect(controller);

    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });

  // Given: href が URL として壊れている
  // When: ログイン遷移を開始する
  // Then: ログアウト中とはみなさず遷移する
  it("TC-A-13: 壊れた href でも遷移する", () => {
    const spy = createSpy({ href: "http://[" });

    startLoginRedirect(spy.controller);

    assert.deepEqual(spy.urls, [LOGOUT_URL]);
  });
});

describe("redirectToLoginPage", () => {
  const consoleErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  const originalQueueMicrotask = globalThis.queueMicrotask;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    resetLoginRedirectForTests();
    consoleErrors.length = 0;
    console.error = (...args: unknown[]): void => {
      consoleErrors.push(args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    globalThis.queueMicrotask = originalQueueMicrotask;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    resetLoginRedirectForTests();
  });

  // Given: ログイン後画面の window
  // When: redirectToLoginPage を呼ぶ
  // Then: microtask で Cookie を削除しログアウト URL へ replace する
  it("TC-N-01: queueMicrotask 後にログアウト URL へ遷移する", () => {
    const cookies: string[] = [];
    const urls: string[] = [];
    let queued: (() => void) | undefined;
    globalThis.queueMicrotask = ((callback: () => void): void => {
      queued = callback;
    }) as typeof queueMicrotask;
    globalThis.window = {
      location: {
        href: "https://app.example/",
        origin: "https://app.example",
        replace: (url: string): void => {
          urls.push(url);
        },
      },
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      set cookie(value: string) {
        cookies.push(value);
      },
      get cookie() {
        return "";
      },
    } as unknown as Document;

    redirectToLoginPage();

    assert.equal(urls.length, 0);
    assert.equal(typeof queued, "function");
    queued?.();

    assert.deepEqual(cookies, [
      EXPIRED_ACCESS_TOKEN_COOKIE,
      EXPIRED_CODE_VERIFIER_COOKIE,
    ]);
    assert.deepEqual(urls, [LOGOUT_URL]);
  });

  // Given: replace が失敗する
  // When: microtask を実行する
  // Then: 例外をログに残し、再試行できる
  it("TC-A-01: 遷移失敗を捕捉して再試行できる", () => {
    let queued: (() => void) | undefined;
    let shouldFail = true;
    const urls: string[] = [];
    globalThis.queueMicrotask = ((callback: () => void): void => {
      queued = callback;
    }) as typeof queueMicrotask;
    globalThis.window = {
      location: {
        href: "https://app.example/",
        origin: "https://app.example",
        replace: (url: string): void => {
          if (shouldFail) {
            throw new Error("Navigation blocked");
          }
          urls.push(url);
        },
      },
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      set cookie(_value: string) {
        return;
      },
      get cookie() {
        return "";
      },
    } as unknown as Document;

    redirectToLoginPage();
    assert.doesNotThrow(() => queued?.());
    assert.equal(consoleErrors[0][0], "Failed to redirect to login page");
    assert.ok(consoleErrors[0][1] instanceof Error);
    assert.equal((consoleErrors[0][1] as Error).message, "Navigation blocked");

    shouldFail = false;
    redirectToLoginPage();
    queued?.();
    assert.deepEqual(urls, [LOGOUT_URL]);
  });

  // Given: すでに logout=true の画面
  // When: redirectToLoginPage を呼ぶ
  // Then: microtask を登録しない
  it("TC-A-02: logout=true では microtask を登録しない", () => {
    let queued = false;
    globalThis.queueMicrotask = ((callback: () => void): void => {
      queued = true;
      callback();
    }) as typeof queueMicrotask;
    globalThis.window = {
      location: {
        href: LOGOUT_URL,
        origin: "https://app.example",
        replace: (): void => {
          throw new Error("should not navigate");
        },
      },
    } as unknown as Window & typeof globalThis;
    globalThis.document = {
      set cookie(_value: string) {
        throw new Error("should not clear cookie");
      },
      get cookie() {
        return "";
      },
    } as unknown as Document;

    redirectToLoginPage();

    assert.equal(queued, false);
  });
});
