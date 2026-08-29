import * as cdk from "aws-cdk-lib";
import { ApNortheast1Stack } from "./ap_northeast_1/index.js";
import {
  AP_NORTHEAST_1_STACK_ID,
  CONTEXT_KEYS,
  US_EAST_1_STACK_ID,
} from "./types/props.js";
import { UsEast1Stack } from "./us_east_1/index.js";

/**
 * コンテキストに指定されたキーが存在するかどうかを判定する
 * @param {cdk.App} app アプリケーション
 * @param {string[]} keys キーの配列
 * @returns {boolean} コンテキストに指定されたキーが存在する場合は true、存在しない場合は false
 */
function hasAnyContext(app: cdk.App, keys: string[]): boolean {
  return keys.some((key) => app.node.tryGetContext(key) !== undefined);
}

/**
 * アプリケーションを作成する
 * @param {cdk.App} existingApp 既存のアプリケーション
 * @returns {cdk.App} アプリケーション
 */
export function createApp(existingApp?: cdk.App): cdk.App {
  const app = existingApp ?? new cdk.App();

  // us-east-1 リージョンのスタックの作成
  if (hasAnyContext(app, [CONTEXT_KEYS.s3LambdaEdgeBucketName])) {
    new UsEast1Stack(app, US_EAST_1_STACK_ID, {
      env: { region: "us-east-1" },
      s3LambdaEdgeBucketName: app.node.tryGetContext(
        CONTEXT_KEYS.s3LambdaEdgeBucketName,
      ) as string,
    });
  }

  // ap-northeast-1 リージョンのスタックの作成
  if (
    hasAnyContext(app, [
      CONTEXT_KEYS.cognitoHostedUISubDomain,
      CONTEXT_KEYS.s3LambdaBucketName,
      CONTEXT_KEYS.s3SpaBucketName,
      CONTEXT_KEYS.wafWebAclArn,
      CONTEXT_KEYS.lambdaEdgeViewerRequestVersionArn,
    ])
  ) {
    new ApNortheast1Stack(app, AP_NORTHEAST_1_STACK_ID, {
      env: { region: "ap-northeast-1" },
      cognitoHostedUISubDomain: app.node.tryGetContext(
        CONTEXT_KEYS.cognitoHostedUISubDomain,
      ) as string,
      s3LambdaBucketName: app.node.tryGetContext(
        CONTEXT_KEYS.s3LambdaBucketName,
      ) as string,
      s3SpaBucketName: app.node.tryGetContext(
        CONTEXT_KEYS.s3SpaBucketName,
      ) as string,
      wafWebAclArn: app.node.tryGetContext(CONTEXT_KEYS.wafWebAclArn) as string,
      lambdaEdgeViewerRequestVersionArn: app.node.tryGetContext(
        CONTEXT_KEYS.lambdaEdgeViewerRequestVersionArn,
      ) as string,
    });
  }

  return app;
}

createApp();
