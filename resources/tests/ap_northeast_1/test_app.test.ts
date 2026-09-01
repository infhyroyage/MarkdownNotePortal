import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { ApNortheast1Stack } from "../../ap_northeast_1/index.js";
import type { ApNortheast1StackProps } from "../../types/props.js";
import { ErrorMessages } from "../../utils/validate.js";

const VALID_PROPS: ApNortheast1StackProps = {
  cognitoHostedUISubDomain: "mkmemoportal-auth",
  s3LambdaBucketName: "lambda-artifacts",
  s3SpaBucketName: "spa-artifacts",
  wafWebAclArn:
    "arn:aws:wafv2:us-east-1:123456789012:global/webacl/mkmemoportal-waf/uuid",
  lambdaEdgeViewerRequestVersionArn:
    "arn:aws:lambda:us-east-1:123456789012:function:mkmemoportal-lambda-edge-viewer-request:1",
};

const AP_NORTHEAST_1_LOGICAL_IDS = [
  "MkmemoportalBackupRole",
  "MkmemoportalIAMRoleLambda",
  "MkmemoportalSpaBucket",
  "MkmemoportalSpaBucketPolicy",
  "MkmemoportalDynamodb",
  "MkmemoportalBackupVault",
  "MkmemoportalBackupPlan",
  "MkmemoportalBackupSelection",
  "MkmemoportalCognito",
  "MkmemoportalCognitoClient",
  "MkmemoportalCognitoDomain",
  "MkmemoportalSsmCognitoClientId",
  "MkmemoportalSsmCognitoDomain",
  "MkmemoportalSsmCloudfrontDomain",
  "MkmemoportalCloudfrontOAC",
  "MkmemoportalCloudfront",
  "MkmemoportalLambdaLayer",
  "CreateMemoFunction",
  "DeleteMemoFunction",
  "GetMemoFunction",
  "ListMemosFunction",
  "UpdateMemoFunction",
  "FormatMemoFunction",
  "MkmemoportalApig",
  "MkmemoportalApigStage",
  "MkmemoportalApigAuthorizer",
  "CreateMemoIntegration",
  "DeleteMemoIntegration",
  "GetMemoIntegration",
  "ListMemosIntegration",
  "UpdateMemoIntegration",
  "FormatMemoIntegration",
  "PostMemoRoute",
  "PostMemoFormatRoute",
  "GetMemosRoute",
  "GetMemoRoute",
  "PutMemoRoute",
  "DeleteMemoRoute",
  "CreateMemoPermission",
  "DeleteMemoPermission",
  "GetMemoPermission",
  "ListMemosPermission",
  "UpdateMemoPermission",
  "FormatMemoPermission",
];

const AP_NORTHEAST_1_OUTPUTS = [
  "ApiEndpoint",
  "CloudFrontDistributionId",
  "CognitoClientId",
  "CognitoDomain",
  "MarkdownMemoPortalUrl",
];

function synthesize(props: Partial<ApNortheast1StackProps> = {}): {
  stack: ApNortheast1Stack;
  template: Template;
} {
  const app = new cdk.App();
  const stack = new ApNortheast1Stack(app, "TestApNortheast1Stack", {
    ...VALID_PROPS,
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe("ApNortheast1Stack", () => {
  it("元の CloudFormation と同じ論理 ID のリソースを作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: 論理 ID が一致する
    const { template } = synthesize();
    const resources = template.toJSON().Resources as Record<string, unknown>;
    expect(Object.keys(resources).sort()).toEqual(
      [...AP_NORTHEAST_1_LOGICAL_IDS].sort(),
    );
  });

  it("DynamoDB テーブルを PAY_PER_REQUEST で作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: user_id / memo_id のキーがある
    const { template } = synthesize();
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "mkmemoportal-dynamodb",
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: "user_id", KeyType: "HASH" }),
        Match.objectLike({ AttributeName: "memo_id", KeyType: "RANGE" }),
      ]),
    });
  });

  it("SPA 用 S3 バケットをパブリックアクセス遮断で作成する", () => {
    // Given: 有効な SPA バケット名
    // When: スタックを合成する
    // Then: BlockPublicAccess とバージョニングが有効
    const { template } = synthesize();
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: VALID_PROPS.s3SpaBucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: "Enabled" },
    });
  });

  it("日次 AWS Backup を 3 日保持で作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: cron(0 18 * * ? *) と DeleteAfterDays 3
    const { template } = synthesize();
    template.hasResourceProperties("AWS::Backup::BackupVault", {
      BackupVaultName: "mkmemoportal-backup-vault",
    });
    template.hasResourceProperties("AWS::Backup::BackupPlan", {
      BackupPlan: Match.objectLike({
        BackupPlanName: "mkmemoportal-backup-plan",
        BackupPlanRule: Match.arrayWith([
          Match.objectLike({
            RuleName: "DailyBackupRule",
            ScheduleExpression: "cron(0 18 * * ? *)",
            Lifecycle: { DeleteAfterDays: 3 },
            StartWindowMinutes: 60,
            CompletionWindowMinutes: 180,
          }),
        ]),
      }),
    });
  });

  it("Cognito ユーザープールを管理者作成のみにする", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: email 必須・TOTP MFA 必須・AdvancedSecurity ENFORCED
    // MFA は CDK 定数のため props から OFF/OPTIONAL/空配列は注入できない
    const { template } = synthesize();
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "mkmemoportal-cognito",
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      MfaConfiguration: "ON",
      EnabledMfas: ["SOFTWARE_TOKEN_MFA"],
      UserPoolAddOns: { AdvancedSecurityMode: "ENFORCED" },
    });
    const userPools = template.findResources("AWS::Cognito::UserPool");
    const userPoolProps = Object.values(userPools)[0]?.Properties as
      | Record<string, unknown>
      | undefined;
    expect(userPoolProps?.EnabledMfas).toEqual(["SOFTWARE_TOKEN_MFA"]);
    expect(userPoolProps).not.toHaveProperty("SmsConfiguration");
    expect(userPoolProps).not.toHaveProperty("EmailConfiguration");
  });

  it("Cognito クライアントのトークン有効期限を設定する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: AccessToken 12 時間、IdToken 60 分
    const { template } = synthesize();
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      ClientName: "mkmemoportal-cognito-client",
      GenerateSecret: false,
      AllowedOAuthFlows: ["code"],
      AccessTokenValidity: 12,
      IdTokenValidity: 60,
      TokenValidityUnits: {
        AccessToken: "hours",
        IdToken: "minutes",
      },
      PreventUserExistenceErrors: "ENABLED",
    });
  });

  it("CloudFront を OAC と Lambda@Edge 付きで作成する", () => {
    // Given: 有効な WAF ARN と Lambda@Edge バージョン ARN
    // When: スタックを合成する
    // Then: viewer-request と PriceClass_100
    const { template } = synthesize();
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Enabled: true,
        DefaultRootObject: "index.html",
        WebACLId: VALID_PROPS.wafWebAclArn,
        PriceClass: "PriceClass_100",
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: "redirect-to-https",
          MinTTL: 0,
          DefaultTTL: 0,
          MaxTTL: 0,
          LambdaFunctionAssociations: Match.arrayWith([
            Match.objectLike({
              EventType: "viewer-request",
              LambdaFunctionARN: VALID_PROPS.lambdaEdgeViewerRequestVersionArn,
            }),
          ]),
        }),
      }),
    });
  });

  it("リージョン Lambda を layer 付きで 6 関数作成する", () => {
    // Given: 有効な Lambda バケット名
    // When: スタックを合成する
    // Then: nodejs24.x / timeout 10 / memory 256 が 6 件
    const { template } = synthesize();
    template.resourceCountIs("AWS::Lambda::Function", 6);
    template.resourceCountIs("AWS::Lambda::LayerVersion", 1);
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "mkmemoportal-lambda-create-memo",
      Runtime: "nodejs24.x",
      Handler: "create_memo/index.handler",
      Timeout: 10,
      MemorySize: 256,
      Code: {
        S3Bucket: VALID_PROPS.s3LambdaBucketName,
        S3Key: "create_memo.zip",
      },
    });
    template.hasResourceProperties("AWS::Lambda::LayerVersion", {
      LayerName: "mkmemoportal-lambda-layer",
      CompatibleRuntimes: ["nodejs24.x"],
      Content: {
        S3Bucket: VALID_PROPS.s3LambdaBucketName,
        S3Key: "layer.zip",
      },
    });
  });

  it("HTTP API に JWT オーソライザーと 6 ルートを作成する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: POST /memo など 6 ルートと $default ステージ
    const { template } = synthesize();
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      Name: "mkmemoportal-apig",
      ProtocolType: "HTTP",
      CorsConfiguration: Match.objectLike({
        AllowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        AllowHeaders: ["*"],
        MaxAge: 300,
      }),
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      StageName: "$default",
      AutoDeploy: true,
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
      AuthorizerType: "JWT",
      Name: "mkmemoportal-cognito-authorizer",
      IdentitySource: ["$request.header.Authorization"],
    });
    template.resourceCountIs("AWS::ApiGatewayV2::Route", 6);
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /memo",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /format",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /memo",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /memo/{memoId}",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /memo/{memoId}",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /memo/{memoId}",
      AuthorizationType: "JWT",
    });
  });

  it("SSM パラメータとスタック出力を作成する", () => {
    // Given: 有効な Cognito ドメイン
    // When: スタックを合成する
    // Then: 3 つの SSM と既存 OutputKey
    const { template } = synthesize();
    template.resourceCountIs("AWS::SSM::Parameter", 3);
    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/mkmemoportal/cognito/client_id",
      Type: "String",
    });
    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/mkmemoportal/cognito/domain",
      Type: "String",
    });
    template.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/mkmemoportal/cloudfront/domain",
      Type: "String",
    });
    const outputs = template.toJSON().Outputs as Record<string, unknown>;
    expect(Object.keys(outputs).sort()).toEqual(
      [...AP_NORTHEAST_1_OUTPUTS].sort(),
    );
  });

  it("Lambda IAM ロールが DynamoDB アクセスを許可する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: dynamodb:*Item/Query/Scan を許可する
    const { template } = synthesize();
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "mkmemoportal-iam-role-lambda",
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: "mkmemoportal-dynamodb-access",
        }),
      ]),
    });
  });

  it("スタック説明文を設定する", () => {
    // Given: 有効な props
    // When: スタックを合成する
    // Then: Description が元テンプレートと一致する
    const { template } = synthesize();
    expect(template.toJSON().Description).toBe(
      "Markdown Memo Portal in ap-northeast-1",
    );
  });

  it("cognitoHostedUISubDomain が undefined ならエラーにする", () => {
    // Given: undefined
    // When: スタックを生成する
    // Then: required エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "MissingSubdomain", {
          ...VALID_PROPS,
          cognitoHostedUISubDomain: undefined as unknown as string,
        }),
    ).toThrowError(ErrorMessages.required("cognitoHostedUISubDomain"));
  });

  it("cognitoHostedUISubDomain が空文字ならエラーにする", () => {
    // Given: 空文字
    // When: スタックを生成する
    // Then: empty エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "EmptySubdomain", {
          ...VALID_PROPS,
          cognitoHostedUISubDomain: "",
        }),
    ).toThrowError(ErrorMessages.empty("cognitoHostedUISubDomain"));
  });

  it("s3LambdaBucketName が 2 文字ならエラーにする", () => {
    // Given: 最小長-1
    // When: スタックを生成する
    // Then: minLength エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "ShortLambdaBucket", {
          ...VALID_PROPS,
          s3LambdaBucketName: "ab",
        }),
    ).toThrowError(ErrorMessages.minLength("s3LambdaBucketName", 3));
  });

  it("s3SpaBucketName が 64 文字ならエラーにする", () => {
    // Given: 最大長+1
    // When: スタックを生成する
    // Then: maxLength エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "LongSpaBucket", {
          ...VALID_PROPS,
          s3SpaBucketName: "a".repeat(64),
        }),
    ).toThrowError(ErrorMessages.maxLength("s3SpaBucketName", 63));
  });

  it("wafWebAclArn が null ならエラーにする", () => {
    // Given: null
    // When: スタックを生成する
    // Then: required エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "NullWafArn", {
          ...VALID_PROPS,
          wafWebAclArn: null as unknown as string,
        }),
    ).toThrowError(ErrorMessages.required("wafWebAclArn"));
  });

  it("wafWebAclArn が空白のみならエラーにする", () => {
    // Given: 空白のみ
    // When: スタックを生成する
    // Then: blank エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "BlankWafArn", {
          ...VALID_PROPS,
          wafWebAclArn: "  ",
        }),
    ).toThrowError(ErrorMessages.blank("wafWebAclArn"));
  });

  it("lambdaEdgeViewerRequestVersionArn が数値ならエラーにする", () => {
    // Given: 数値
    // When: スタックを生成する
    // Then: mustBeString エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "NumberEdgeArn", {
          ...VALID_PROPS,
          lambdaEdgeViewerRequestVersionArn: 0 as unknown as string,
        }),
    ).toThrowError(
      ErrorMessages.mustBeString("lambdaEdgeViewerRequestVersionArn"),
    );
  });

  it("lambdaEdgeViewerRequestVersionArn が空文字ならエラーにする", () => {
    // Given: 空文字
    // When: スタックを生成する
    // Then: empty エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "EmptyEdgeArn", {
          ...VALID_PROPS,
          lambdaEdgeViewerRequestVersionArn: "",
        }),
    ).toThrowError(ErrorMessages.empty("lambdaEdgeViewerRequestVersionArn"));
  });

  it("s3LambdaBucketName が null ならエラーにする", () => {
    // Given: null
    // When: スタックを生成する
    // Then: required エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "NullLambdaBucket", {
          ...VALID_PROPS,
          s3LambdaBucketName: null as unknown as string,
        }),
    ).toThrowError(ErrorMessages.required("s3LambdaBucketName"));
  });

  it("s3SpaBucketName が空文字ならエラーにする", () => {
    // Given: 空文字
    // When: スタックを生成する
    // Then: empty エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "EmptySpaBucket", {
          ...VALID_PROPS,
          s3SpaBucketName: "",
        }),
    ).toThrowError(ErrorMessages.empty("s3SpaBucketName"));
  });

  it("s3SpaBucketName がオブジェクトならエラーにする", () => {
    // Given: 不正な型
    // When: スタックを生成する
    // Then: mustBeString エラー
    const app = new cdk.App();
    expect(
      () =>
        new ApNortheast1Stack(app, "ObjectSpaBucket", {
          ...VALID_PROPS,
          s3SpaBucketName: { name: "spa" } as unknown as string,
        }),
    ).toThrowError(ErrorMessages.mustBeString("s3SpaBucketName"));
  });
});
