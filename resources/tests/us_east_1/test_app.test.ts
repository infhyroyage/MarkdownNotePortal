import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import type { UsEast1StackProps } from "../../types/props.js";
import { UsEast1Stack } from "../../us_east_1/index.js";
import { ErrorMessages } from "../../utils/validate.js";

const VALID_BUCKET = "lambda-edge-artifacts";

const US_EAST_1_LOGICAL_IDS = [
  "MkmemoportalWafLogGroup",
  "MkmemoportalWaf",
  "MkmemoportalWafLoggingConfiguration",
  "MkmemoportalIAMRoleLambdaEdge",
  "MkmemoportalLambdaEdgeViewerRequest",
  "MkmemoportalLambdaEdgeViewerRequestVersion",
];

function synthesize(
  props: Partial<UsEast1StackProps> = {},
): { stack: UsEast1Stack; template: Template } {
  const app = new cdk.App();
  const stack = new UsEast1Stack(app, "TestUsEast1Stack", {
    s3LambdaEdgeBucketName: VALID_BUCKET,
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe("UsEast1Stack", () => {
  it("元の CloudFormation と同じ論理 ID のリソースを作成する", () => {
    // Given: 有効なバケット名
    // When: スタックを合成する
    // Then: 論理 ID が一致し、追加リソースがない
    const { template } = synthesize();
    const resources = template.toJSON().Resources as Record<string, unknown>;
    expect(Object.keys(resources).sort()).toEqual(
      [...US_EAST_1_LOGICAL_IDS].sort(),
    );
  });

  it("WAF Web ACL を CloudFront スコープで作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: CommonRuleSet を優先度 1 で持つ Web ACL がある
    const { template } = synthesize();
    template.resourceCountIs("AWS::WAFv2::WebACL", 1);
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Name: "mkmemoportal-waf",
      Scope: "CLOUDFRONT",
      DefaultAction: { Allow: {} },
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: "AWSManagedRulesCommonRuleSet",
          Priority: 1,
        }),
      ]),
    });
  });

  it("WAF ロググループの保持期間を 90 日にする", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: aws-waf-logs- で始まるロググループがある
    const { template } = synthesize();
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "aws-waf-logs-mkmemoportal",
      RetentionInDays: 90,
    });
  });

  it("WAF のログ設定をロググループへ紐付ける", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: LoggingConfiguration が 1 つある
    const { template } = synthesize();
    template.resourceCountIs("AWS::WAFv2::LoggingConfiguration", 1);
  });

  it("Lambda@Edge 関数を nodejs24.x / timeout 5 / memory 128 で作成する", () => {
    // Given: 有効なバケット名
    // When: スタックを合成する
    // Then: S3 上の zip を参照する Lambda がある
    const { template } = synthesize();
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "mkmemoportal-lambda-edge-viewer-request",
      Runtime: "nodejs24.x",
      Handler: "edge_viewer_request/index.handler",
      Timeout: 5,
      MemorySize: 128,
      Code: {
        S3Bucket: VALID_BUCKET,
        S3Key: "edge_viewer_request.zip",
      },
    });
  });

  it("Lambda@Edge 用 IAM ロールが SSM 読み取りを許可する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: edgelambda を信頼し SSM GetParameter を許可する
    const { template } = synthesize();
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "mkmemoportal-iam-role-lambda-edge",
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: {
              Service: Match.arrayWith([
                "lambda.amazonaws.com",
                "edgelambda.amazonaws.com",
              ]),
            },
          }),
        ]),
      }),
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: "mkmemoportal-ssm-parameter-access",
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith([
                  "ssm:GetParameter",
                  "ssm:GetParameters",
                ]),
              }),
            ]),
          }),
        }),
      ]),
    });
  });

  it("Lambda@Edge のバージョンリソースを作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: Version が 1 つある
    const { template } = synthesize();
    template.resourceCountIs("AWS::Lambda::Version", 1);
    template.hasResourceProperties("AWS::Lambda::Version", {
      Description: "Lambda@Edge Viewer Request Version",
    });
  });

  it("WAF と Lambda@Edge の出力をエクスポートする", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: 既存ワークフローが参照する OutputKey がある
    const { template } = synthesize();
    const outputs = template.toJSON().Outputs as Record<string, unknown>;
    expect(Object.keys(outputs).sort()).toEqual(
      ["LambdaEdgeViewerRequestVersionArn", "WafWebAclArn"].sort(),
    );
    template.hasOutput("WafWebAclArn", {
      Export: { Name: { "Fn::Sub": "${AWS::StackName}-WafWebAclArn" } },
    });
    template.hasOutput("LambdaEdgeViewerRequestVersionArn", {
      Export: {
        Name: {
          "Fn::Sub": "${AWS::StackName}-LambdaEdgeViewerRequestVersionArn",
        },
      },
    });
  });

  it("スタック説明文を設定する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: Description が元テンプレートと一致する
    const { template } = synthesize();
    expect(template.toJSON().Description).toBe(
      "Markdown Memo Portal in us-east-1",
    );
  });

  it("s3LambdaEdgeBucketName が undefined ならエラーにする", () => {
    // Given: undefined
    // When: スタックを生成する
    // Then: required エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "InvalidUsEast1", {
          s3LambdaEdgeBucketName: undefined as unknown as string,
        }),
    ).toThrowError(ErrorMessages.required("s3LambdaEdgeBucketName"));
  });

  it("s3LambdaEdgeBucketName が null ならエラーにする", () => {
    // Given: null
    // When: スタックを生成する
    // Then: required エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "NullUsEast1", {
          s3LambdaEdgeBucketName: null as unknown as string,
        }),
    ).toThrowError(ErrorMessages.required("s3LambdaEdgeBucketName"));
  });

  it("s3LambdaEdgeBucketName が空文字ならエラーにする", () => {
    // Given: 空文字
    // When: スタックを生成する
    // Then: empty エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "EmptyUsEast1", {
          s3LambdaEdgeBucketName: "",
        }),
    ).toThrowError(ErrorMessages.empty("s3LambdaEdgeBucketName"));
  });

  it("s3LambdaEdgeBucketName が空白のみならエラーにする", () => {
    // Given: 空白のみ
    // When: スタックを生成する
    // Then: blank エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "BlankUsEast1", {
          s3LambdaEdgeBucketName: "   ",
        }),
    ).toThrowError(ErrorMessages.blank("s3LambdaEdgeBucketName"));
  });

  it("s3LambdaEdgeBucketName が数値ならエラーにする", () => {
    // Given: 数値
    // When: スタックを生成する
    // Then: mustBeString エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "NumberUsEast1", {
          s3LambdaEdgeBucketName: 0 as unknown as string,
        }),
    ).toThrowError(ErrorMessages.mustBeString("s3LambdaEdgeBucketName"));
  });

  it("s3LambdaEdgeBucketName が 2 文字ならエラーにする", () => {
    // Given: 最小長-1
    // When: スタックを生成する
    // Then: minLength エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "ShortUsEast1", {
          s3LambdaEdgeBucketName: "ab",
        }),
    ).toThrowError(ErrorMessages.minLength("s3LambdaEdgeBucketName", 3));
  });

  it("s3LambdaEdgeBucketName が 64 文字ならエラーにする", () => {
    // Given: 最大長+1
    // When: スタックを生成する
    // Then: maxLength エラー
    const app = new cdk.App();
    expect(
      () =>
        new UsEast1Stack(app, "LongUsEast1", {
          s3LambdaEdgeBucketName: "a".repeat(64),
        }),
    ).toThrowError(ErrorMessages.maxLength("s3LambdaEdgeBucketName", 63));
  });
});
