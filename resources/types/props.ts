import type * as cdk from "aws-cdk-lib";

/**
 * us-east-1 リージョンの CloudFormation スタック ID
 */
export const US_EAST_1_STACK_ID: string = "mkmemoportal-stack-us-east-1";

/**
 * ap-northeast-1 リージョンの CloudFormation スタック ID
 */
export const AP_NORTHEAST_1_STACK_ID: string =
  "mkmemoportal-stack-ap-northeast-1";

/**
 * コンテキストキー
 */
export const CONTEXT_KEYS: Record<string, string> = {
  /**
   * Lambda@Edge 関数のビルドアーティファクトを保存するバケット名
   */
  s3LambdaEdgeBucketName: "s3LambdaEdgeBucketName",

  /**
   * Cognito Hosted UI のドメイン
   */
  cognitoHostedUISubDomain: "cognitoHostedUISubDomain",

  /**
   * Lambda 関数のビルドアーティファクトを保存するバケット名
   */
  s3LambdaBucketName: "s3LambdaBucketName",

  /**
   * SPA のビルドアーティファクトを保存するバケット名
   */
  s3SpaBucketName: "s3SpaBucketName",

  /**
   * WAF Web ACL の ARN
   */
  wafWebAclArn: "wafWebAclArn",

  /**
   * Lambda@Edge Viewer Request バージョンの ARN
   */
  lambdaEdgeViewerRequestVersionArn: "lambdaEdgeViewerRequestVersionArn",
};

/**
 * us-east-1 リージョンのスタックプロパティ
 */
export interface UsEast1StackProps extends cdk.StackProps {
  s3LambdaEdgeBucketName: string;
}

/**
 * ap-northeast-1 リージョンのスタックプロパティ
 */
export interface ApNortheast1StackProps extends cdk.StackProps {
  cognitoHostedUISubDomain: string;
  s3LambdaBucketName: string;
  s3SpaBucketName: string;
  wafWebAclArn: string;
  lambdaEdgeViewerRequestVersionArn: string;
}
