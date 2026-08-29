import { CfnOutput, Stack } from "aws-cdk-lib";
import { describe, expect, it } from "vitest";
import { setLogicalId } from "../../utils/cfn.js";
import {
  ErrorMessages,
  requireNonEmptyString,
  requireS3BucketName,
} from "../../utils/validate.js";

describe("requireNonEmptyString", () => {
  it("正常な文字列をそのまま返す", () => {
    // Given: 空でない文字列
    // When: バリデーションを実行する
    // Then: 同じ文字列が返る
    expect(requireNonEmptyString("valid", "field")).toBe("valid");
  });

  it("最小長ちょうどを許容する", () => {
    // Given: minLength と一致する文字列
    // When: バリデーションを実行する
    // Then: 同じ文字列が返る
    expect(
      requireNonEmptyString("abc", "field", { minLength: 3 }),
    ).toBe("abc");
  });

  it("最大長ちょうどを許容する", () => {
    // Given: maxLength と一致する文字列
    // When: バリデーションを実行する
    // Then: 同じ文字列が返る
    expect(
      requireNonEmptyString("abcd", "field", { maxLength: 4 }),
    ).toBe("abcd");
  });

  it("前後空白を含む非空文字列を許容する", () => {
    // Given: trim すると短くなるが length は minLength 以上
    // When: バリデーションを実行する
    // Then: 元の文字列が返る
    expect(requireNonEmptyString(" ab ", "field", { minLength: 3 })).toBe(
      " ab ",
    );
  });

  it("null の場合は required エラーを投げる", () => {
    // Given: null
    // When: バリデーションを実行する
    // Then: Error と required メッセージ
    expect(() => requireNonEmptyString(null, "field")).toThrowError(
      Error,
    );
    expect(() => requireNonEmptyString(null, "field")).toThrowError(
      ErrorMessages.required("field"),
    );
  });

  it("undefined の場合は required エラーを投げる", () => {
    // Given: undefined
    // When: バリデーションを実行する
    // Then: Error と required メッセージ
    expect(() => requireNonEmptyString(undefined, "field")).toThrowError(
      ErrorMessages.required("field"),
    );
  });

  it("空文字の場合は empty エラーを投げる", () => {
    // Given: 空文字 (境界値 0)
    // When: バリデーションを実行する
    // Then: Error と empty メッセージ
    expect(() => requireNonEmptyString("", "field")).toThrowError(
      ErrorMessages.empty("field"),
    );
  });

  it("空白のみの場合は blank エラーを投げる", () => {
    // Given: 空白のみ
    // When: バリデーションを実行する
    // Then: Error と blank メッセージ
    expect(() => requireNonEmptyString("   ", "field")).toThrowError(
      ErrorMessages.blank("field"),
    );
  });

  it("数値 0 の場合は mustBeString エラーを投げる", () => {
    // Given: 数値 0
    // When: バリデーションを実行する
    // Then: Error と mustBeString メッセージ
    expect(() => requireNonEmptyString(0, "field")).toThrowError(
      ErrorMessages.mustBeString("field"),
    );
  });

  it("boolean の場合は mustBeString エラーを投げる", () => {
    // Given: boolean
    // When: バリデーションを実行する
    // Then: Error と mustBeString メッセージ
    expect(() => requireNonEmptyString(false, "field")).toThrowError(
      ErrorMessages.mustBeString("field"),
    );
  });

  it("object の場合は mustBeString エラーを投げる", () => {
    // Given: オブジェクト
    // When: バリデーションを実行する
    // Then: Error と mustBeString メッセージ
    expect(() => requireNonEmptyString({ value: "x" }, "field")).toThrowError(
      ErrorMessages.mustBeString("field"),
    );
  });

  it("配列の場合は mustBeString エラーを投げる", () => {
    // Given: 配列
    // When: バリデーションを実行する
    // Then: Error と mustBeString メッセージ
    expect(() => requireNonEmptyString(["x"], "field")).toThrowError(
      ErrorMessages.mustBeString("field"),
    );
  });

  it("最小長-1 の場合は minLength エラーを投げる", () => {
    // Given: minLength より 1 短い文字列
    // When: バリデーションを実行する
    // Then: Error と minLength メッセージ
    expect(() =>
      requireNonEmptyString("ab", "field", { minLength: 3 }),
    ).toThrowError(ErrorMessages.minLength("field", 3));
  });

  it("最大長+1 の場合は maxLength エラーを投げる", () => {
    // Given: maxLength より 1 長い文字列
    // When: バリデーションを実行する
    // Then: Error と maxLength メッセージ
    expect(() =>
      requireNonEmptyString("abcde", "field", { maxLength: 4 }),
    ).toThrowError(ErrorMessages.maxLength("field", 4));
  });
});

describe("requireS3BucketName", () => {
  it("3 文字のバケット名を許容する", () => {
    // Given: S3 最小長 3
    // When: バリデーションを実行する
    // Then: 同じ文字列が返る
    expect(requireS3BucketName("abc", "bucket")).toBe("abc");
  });

  it("63 文字のバケット名を許容する", () => {
    // Given: S3 最大長 63
    // When: バリデーションを実行する
    // Then: 同じ文字列が返る
    const name = "a".repeat(63);
    expect(requireS3BucketName(name, "bucket")).toBe(name);
  });

  it("2 文字のバケット名は拒否する", () => {
    // Given: 最小長-1
    // When: バリデーションを実行する
    // Then: minLength エラー
    expect(() => requireS3BucketName("ab", "bucket")).toThrowError(
      ErrorMessages.minLength("bucket", 3),
    );
  });

  it("64 文字のバケット名は拒否する", () => {
    // Given: 最大長+1
    // When: バリデーションを実行する
    // Then: maxLength エラー
    expect(() => requireS3BucketName("a".repeat(64), "bucket")).toThrowError(
      ErrorMessages.maxLength("bucket", 63),
    );
  });

  it("null のバケット名は拒否する", () => {
    // Given: null
    // When: バリデーションを実行する
    // Then: required エラー
    expect(() => requireS3BucketName(null, "bucket")).toThrowError(
      ErrorMessages.required("bucket"),
    );
  });
});

describe("setLogicalId", () => {
  it("論理 ID を上書きする", () => {
    // Given: CfnOutput と有効な論理 ID
    // When: setLogicalId を実行する
    // Then: 例外なく完了する
    const stack = new Stack();
    const output = new CfnOutput(stack, "GeneratedId", { value: "v" });
    expect(() => setLogicalId(output, "StableLogicalId")).not.toThrow();
  });

  it("空の論理 ID は拒否する", () => {
    // Given: 空文字
    // When: setLogicalId を実行する
    // Then: empty エラー
    const stack = new Stack();
    const output = new CfnOutput(stack, "GeneratedIdEmpty", { value: "v" });
    expect(() => setLogicalId(output, "")).toThrowError(
      ErrorMessages.empty("logicalId"),
    );
  });

  it("空白のみの論理 ID は拒否する", () => {
    // Given: 空白のみ
    // When: setLogicalId を実行する
    // Then: blank エラー
    const stack = new Stack();
    const output = new CfnOutput(stack, "GeneratedIdBlank", { value: "v" });
    expect(() => setLogicalId(output, "   ")).toThrowError(
      ErrorMessages.blank("logicalId"),
    );
  });
});
