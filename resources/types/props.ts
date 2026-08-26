import type * as cdk from "aws-cdk-lib";

export const US_EAST_1_STACK_ID = "mkmemoportal-stack-us-east-1";
export const AP_NORTHEAST_1_STACK_ID = "mkmemoportal-stack-ap-northeast-1";

export const CONTEXT_KEYS = {
  s3LambdaEdgeBucketName: "s3LambdaEdgeBucketName",
  cognitoHostedUISubDomain: "cognitoHostedUISubDomain",
  s3LambdaBucketName: "s3LambdaBucketName",
  s3SpaBucketName: "s3SpaBucketName",
  wafWebAclArn: "wafWebAclArn",
  lambdaEdgeViewerRequestVersionArn: "lambdaEdgeViewerRequestVersionArn",
} as const;

export interface UsEast1StackProps extends cdk.StackProps {
  s3LambdaEdgeBucketName: string;
}

export interface ApNortheast1StackProps extends cdk.StackProps {
  cognitoHostedUISubDomain: string;
  s3LambdaBucketName: string;
  s3SpaBucketName: string;
  wafWebAclArn: string;
  lambdaEdgeViewerRequestVersionArn: string;
}
