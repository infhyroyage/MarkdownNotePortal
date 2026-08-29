import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";
import type { UsEast1StackProps } from "../types/props.js";
import { setLogicalId } from "../utils/cfn.js";
import { requireS3BucketName } from "../utils/validate.js";

/**
 * us-east-1 リージョンのスタック
 */
export class UsEast1Stack extends cdk.Stack {
  /**
   * コンストラクタ
   * @param {Construct} scope スコープ
   * @param {string} id スタック ID
   * @param {UsEast1StackProps} props us-east-1 リージョンのスタックプロパティ
   */
  constructor(scope: Construct, id: string, props: UsEast1StackProps) {
    super(scope, id, {
      ...props,
      description: "Markdown Memo Portal in us-east-1",
      synthesizer:
        props.synthesizer ?? new cdk.CliCredentialsStackSynthesizer(),
    });

    // Lambda@Edge 関数のビルドアーティファクトを保存するバケット名の取得
    const s3LambdaEdgeBucketName = requireS3BucketName(
      props.s3LambdaEdgeBucketName,
      "s3LambdaEdgeBucketName",
    );

    // WAF ロググループ
    const wafLogGroup = new logs.CfnLogGroup(this, "MkmemoportalWafLogGroup", {
      logGroupName: "aws-waf-logs-mkmemoportal",
      retentionInDays: 90,
    });
    setLogicalId(wafLogGroup, "MkmemoportalWafLogGroup");

    // WAF Web ACL
    const waf = new wafv2.CfnWebACL(this, "MkmemoportalWaf", {
      name: "mkmemoportal-waf",
      scope: "CLOUDFRONT",
      description: "Web ACL for CloudFront distribution",
      defaultAction: { allow: {} },
      rules: [
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 1,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSetMetric",
          },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: "MkmemoportalWafMetric",
      },
    });
    setLogicalId(waf, "MkmemoportalWaf");

    // WAF ログ設定
    const wafLogging = new wafv2.CfnLoggingConfiguration(
      this,
      "MkmemoportalWafLoggingConfiguration",
      {
        resourceArn: waf.attrArn,
        logDestinationConfigs: [wafLogGroup.attrArn],
      },
    );
    setLogicalId(wafLogging, "MkmemoportalWafLoggingConfiguration");

    // Lambda@Edge 関数の IAM ロール
    const lambdaEdgeRole = new iam.CfnRole(
      this,
      "MkmemoportalIAMRoleLambdaEdge",
      {
        roleName: "mkmemoportal-iam-role-lambda-edge",
        assumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: ["lambda.amazonaws.com", "edgelambda.amazonaws.com"],
              },
              Action: ["sts:AssumeRole"],
            },
          ],
        },
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        ],
        policies: [
          {
            policyName: "mkmemoportal-ssm-parameter-access",
            policyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Action: ["ssm:GetParameter", "ssm:GetParameters"],
                  Resource: [
                    cdk.Fn.sub(
                      "arn:aws:ssm:ap-northeast-1:${AWS::AccountId}:parameter/mkmemoportal/*",
                    ),
                  ],
                },
              ],
            },
          },
        ],
      },
    );
    setLogicalId(lambdaEdgeRole, "MkmemoportalIAMRoleLambdaEdge");

    // Lambda@Edge Viewer Request 関数
    const lambdaEdgeFunction = new lambda.CfnFunction(
      this,
      "MkmemoportalLambdaEdgeViewerRequest",
      {
        functionName: "mkmemoportal-lambda-edge-viewer-request",
        runtime: "nodejs24.x",
        handler: "edge_viewer_request/index.handler",
        role: lambdaEdgeRole.attrArn,
        code: {
          s3Bucket: s3LambdaEdgeBucketName,
          s3Key: "edge_viewer_request.zip",
        },
        timeout: 5,
        memorySize: 128,
      },
    );
    setLogicalId(lambdaEdgeFunction, "MkmemoportalLambdaEdgeViewerRequest");

    // Lambda@Edge Viewer Request バージョン
    const lambdaEdgeVersion = new lambda.CfnVersion(
      this,
      "MkmemoportalLambdaEdgeViewerRequestVersion",
      {
        functionName: lambdaEdgeFunction.ref,
        description: "Lambda@Edge Viewer Request Version",
      },
    );
    setLogicalId(
      lambdaEdgeVersion,
      "MkmemoportalLambdaEdgeViewerRequestVersion",
    );

    // WAF Web ACL ARNの出力
    const wafWebAclArnOutput = new cdk.CfnOutput(this, "WafWebAclArn", {
      description: "WAF Web ACL ARN in us-east-1",
      value: waf.attrArn,
      exportName: cdk.Fn.sub("${AWS::StackName}-WafWebAclArn"),
    });
    setLogicalId(wafWebAclArnOutput, "WafWebAclArn");

    // Lambda@Edge Viewer Request バージョン ARNの出力
    const lambdaEdgeVersionArnOutput = new cdk.CfnOutput(
      this,
      "LambdaEdgeViewerRequestVersionArn",
      {
        description: "Lambda@Edge Viewer Request Version ARN",
        value: lambdaEdgeVersion.ref,
        exportName: cdk.Fn.sub(
          "${AWS::StackName}-LambdaEdgeViewerRequestVersionArn",
        ),
      },
    );
    setLogicalId(
      lambdaEdgeVersionArnOutput,
      "LambdaEdgeViewerRequestVersionArn",
    );
  }
}
