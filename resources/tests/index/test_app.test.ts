import * as cdk from "aws-cdk-lib";
import { describe, expect, it } from "vitest";
import { createApp } from "../../index.js";
import {
  AP_NORTHEAST_1_STACK_ID,
  CONTEXT_KEYS,
  US_EAST_1_STACK_ID,
} from "../../types/props.js";
import { ErrorMessages } from "../../utils/validate.js";

const US_EAST_1_CONTEXT = {
  [CONTEXT_KEYS.s3LambdaEdgeBucketName]: "lambda-edge-artifacts",
};

const AP_NORTHEAST_1_CONTEXT = {
  [CONTEXT_KEYS.cognitoHostedUISubDomain]: "mkmemoportal-auth",
  [CONTEXT_KEYS.s3LambdaBucketName]: "lambda-artifacts",
  [CONTEXT_KEYS.s3SpaBucketName]: "spa-artifacts",
  [CONTEXT_KEYS.wafWebAclArn]:
    "arn:aws:wafv2:us-east-1:123456789012:global/webacl/mkmemoportal-waf/uuid",
  [CONTEXT_KEYS.lambdaEdgeViewerRequestVersionArn]:
    "arn:aws:lambda:us-east-1:123456789012:function:mkmemoportal-lambda-edge-viewer-request:1",
};

describe("createApp", () => {
  it("コンテキストなしではスタックを作らない", () => {
    // Given: 空の App
    // When: createApp を実行する
    // Then: どちらのスタックも存在しない
    const app = createApp(new cdk.App());
    expect(app.node.tryFindChild(US_EAST_1_STACK_ID)).toBeUndefined();
    expect(app.node.tryFindChild(AP_NORTHEAST_1_STACK_ID)).toBeUndefined();
  });

  it("us-east-1 のコンテキストだけで当該スタックを作る", () => {
    // Given: s3LambdaEdgeBucketName のみ
    // When: createApp を実行する
    // Then: us-east-1 スタックのみ存在する
    const app = createApp(
      new cdk.App({ context: US_EAST_1_CONTEXT }),
    );
    expect(app.node.tryFindChild(US_EAST_1_STACK_ID)).toBeDefined();
    expect(app.node.tryFindChild(AP_NORTHEAST_1_STACK_ID)).toBeUndefined();
  });

  it("ap-northeast-1 のコンテキストだけで当該スタックを作る", () => {
    // Given: ap-northeast-1 用コンテキストのみ
    // When: createApp を実行する
    // Then: ap-northeast-1 スタックのみ存在する
    const app = createApp(
      new cdk.App({ context: AP_NORTHEAST_1_CONTEXT }),
    );
    expect(app.node.tryFindChild(US_EAST_1_STACK_ID)).toBeUndefined();
    expect(app.node.tryFindChild(AP_NORTHEAST_1_STACK_ID)).toBeDefined();
  });

  it("両方のコンテキストがある場合は両スタックを作る", () => {
    // Given: 両リージョンのコンテキスト
    // When: createApp を実行する
    // Then: 両方のスタックが存在する
    const app = createApp(
      new cdk.App({
        context: { ...US_EAST_1_CONTEXT, ...AP_NORTHEAST_1_CONTEXT },
      }),
    );
    expect(app.node.tryFindChild(US_EAST_1_STACK_ID)).toBeDefined();
    expect(app.node.tryFindChild(AP_NORTHEAST_1_STACK_ID)).toBeDefined();
  });

  it("既存 App を渡さない場合も App を返す", () => {
    // Given: 引数なし
    // When: createApp を実行する
    // Then: cdk.App インスタンスが返る
    const app = createApp();
    expect(app).toBeInstanceOf(cdk.App);
  });

  it("us-east-1 コンテキストが空文字ならエラーにする", () => {
    // Given: 空のバケット名コンテキスト
    // When: createApp を実行する
    // Then: empty エラー
    expect(() =>
      createApp(
        new cdk.App({
          context: { [CONTEXT_KEYS.s3LambdaEdgeBucketName]: "" },
        }),
      ),
    ).toThrowError(ErrorMessages.empty("s3LambdaEdgeBucketName"));
  });

  it("ap-northeast-1 の必須コンテキストが欠けていればエラーにする", () => {
    // Given: subdomain だけ指定
    // When: createApp を実行する
    // Then: 欠けた項目の required エラー
    expect(() =>
      createApp(
        new cdk.App({
          context: {
            [CONTEXT_KEYS.cognitoHostedUISubDomain]: "mkmemoportal-auth",
          },
        }),
      ),
    ).toThrowError(ErrorMessages.required("s3LambdaBucketName"));
  });

  it("s3SpaBucketName が数値ならエラーにする", () => {
    // Given: 不正な型の SPA バケット名
    // When: createApp を実行する
    // Then: mustBeString エラー
    expect(() =>
      createApp(
        new cdk.App({
          context: {
            ...AP_NORTHEAST_1_CONTEXT,
            [CONTEXT_KEYS.s3SpaBucketName]: 0,
          },
        }),
      ),
    ).toThrowError(ErrorMessages.mustBeString("s3SpaBucketName"));
  });

  it("wafWebAclArn が空文字ならエラーにする", () => {
    // Given: 空の WAF ARN
    // When: createApp を実行する
    // Then: empty エラー
    expect(() =>
      createApp(
        new cdk.App({
          context: {
            ...AP_NORTHEAST_1_CONTEXT,
            [CONTEXT_KEYS.wafWebAclArn]: "",
          },
        }),
      ),
    ).toThrowError(ErrorMessages.empty("wafWebAclArn"));
  });

  it("lambdaEdgeViewerRequestVersionArn が null ならエラーにする", () => {
    // Given: null の Lambda@Edge ARN
    // When: createApp を実行する
    // Then: required エラー
    expect(() =>
      createApp(
        new cdk.App({
          context: {
            ...AP_NORTHEAST_1_CONTEXT,
            [CONTEXT_KEYS.lambdaEdgeViewerRequestVersionArn]: null,
          },
        }),
      ),
    ).toThrowError(
      ErrorMessages.required("lambdaEdgeViewerRequestVersionArn"),
    );
  });
});
