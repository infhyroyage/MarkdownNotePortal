import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isUnauthorizedApiError, redirectToLoginPage } from "./api";

describe("isUnauthorizedApiError", () => {
  // Given: Axios の 401 レスポンス
  // When: isUnauthorizedApiError を呼ぶ
  // Then: true を返す
  it("AxiosError で status が 401 のとき true", () => {
    const err = new AxiosError("Unauthorized");
    err.response = {
      status: 401,
      statusText: "Unauthorized",
      data: { message: "Not authenticated" },
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };
    expect(isUnauthorizedApiError(err)).toBe(true);
  });

  // Given: Axios の 403 レスポンス
  // When: isUnauthorizedApiError を呼ぶ
  // Then: false を返す
  it("AxiosError で status が 401 以外のとき false", () => {
    const err = new AxiosError("Forbidden");
    err.response = {
      status: 403,
      statusText: "Forbidden",
      data: {},
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };
    expect(isUnauthorizedApiError(err)).toBe(false);
  });

  // Given: AxiosError だが response が無い
  // When: isUnauthorizedApiError を呼ぶ
  // Then: false を返す
  it("AxiosError で response が無いとき false", () => {
    const err = new AxiosError("Network Error");
    expect(isUnauthorizedApiError(err)).toBe(false);
  });

  // Given: 通常の Error
  // When: isUnauthorizedApiError を呼ぶ
  // Then: false を返す
  it("AxiosError でないとき false", () => {
    expect(isUnauthorizedApiError(new Error("fail"))).toBe(false);
  });

  // Given: 文字列
  // When: isUnauthorizedApiError を呼ぶ
  // Then: false を返す
  it("文字列のとき false", () => {
    expect(isUnauthorizedApiError("oops")).toBe(false);
  });
});

describe("redirectToLoginPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Given: queueMicrotask が同期的にコールバックを実行する
  // When: redirectToLoginPage を呼ぶ
  // Then: window.location.replace が "/" で呼ばれる
  it("ドキュメントルートへ replace する", () => {
    const replace = vi.fn();
    vi.stubGlobal("queueMicrotask", (cb: () => void) => {
      cb();
    });
    vi.stubGlobal("window", {
      ...window,
      location: { replace },
    });

    redirectToLoginPage();

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
