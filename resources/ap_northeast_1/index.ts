import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as backup from "aws-cdk-lib/aws-backup";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { ApNortheast1StackProps } from "../types/props.js";
import { setLogicalId } from "../utils/cfn.js";
import {
  requireNonEmptyString,
  requireS3BucketName,
} from "../utils/validate.js";

/**
 * Lambda 関数の定義
 */
interface ApiLambdaDefinition {
  logicalId: string;
  functionName: string;
  handler: string;
  s3Key: string;
  integrationLogicalId: string;
  permissionLogicalId: string;
  routeLogicalId: string;
  routeKey: string;
}

/**
 * Lambda 関数の定義の配列
 */
const API_LAMBDAS: ApiLambdaDefinition[] = [
  {
    logicalId: "CreateMemoFunction",
    functionName: "mkmemoportal-lambda-create-memo",
    handler: "create_memo/index.handler",
    s3Key: "create_memo.zip",
    integrationLogicalId: "CreateMemoIntegration",
    permissionLogicalId: "CreateMemoPermission",
    routeLogicalId: "PostMemoRoute",
    routeKey: "POST /memo",
  },
  {
    logicalId: "DeleteMemoFunction",
    functionName: "mkmemoportal-lambda-delete-memo",
    handler: "delete_memo/index.handler",
    s3Key: "delete_memo.zip",
    integrationLogicalId: "DeleteMemoIntegration",
    permissionLogicalId: "DeleteMemoPermission",
    routeLogicalId: "DeleteMemoRoute",
    routeKey: "DELETE /memo/{memoId}",
  },
  {
    logicalId: "GetMemoFunction",
    functionName: "mkmemoportal-lambda-get-memo",
    handler: "get_memo/index.handler",
    s3Key: "get_memo.zip",
    integrationLogicalId: "GetMemoIntegration",
    permissionLogicalId: "GetMemoPermission",
    routeLogicalId: "GetMemoRoute",
    routeKey: "GET /memo/{memoId}",
  },
  {
    logicalId: "ListMemosFunction",
    functionName: "mkmemoportal-lambda-list-memos",
    handler: "list_memos/index.handler",
    s3Key: "list_memos.zip",
    integrationLogicalId: "ListMemosIntegration",
    permissionLogicalId: "ListMemosPermission",
    routeLogicalId: "GetMemosRoute",
    routeKey: "GET /memo",
  },
  {
    logicalId: "UpdateMemoFunction",
    functionName: "mkmemoportal-lambda-update-memo",
    handler: "update_memo/index.handler",
    s3Key: "update_memo.zip",
    integrationLogicalId: "UpdateMemoIntegration",
    permissionLogicalId: "UpdateMemoPermission",
    routeLogicalId: "PutMemoRoute",
    routeKey: "PUT /memo/{memoId}",
  },
  {
    logicalId: "FormatMemoFunction",
    functionName: "mkmemoportal-lambda-format-memo",
    handler: "format_memo/index.handler",
    s3Key: "format_memo.zip",
    integrationLogicalId: "FormatMemoIntegration",
    permissionLogicalId: "FormatMemoPermission",
    routeLogicalId: "PostMemoFormatRoute",
    routeKey: "POST /format",
  },
];

/**
 * ap-northeast-1 リージョンのスタック
 */
export class ApNortheast1Stack extends cdk.Stack {
  /**
   * コンストラクタ
   * @param {Construct} scope スコープ
   * @param {string} id スタック ID
   * @param {ApNortheast1StackProps} props ap-northeast-1 リージョンのスタックプロパティ
   */
  constructor(scope: Construct, id: string, props: ApNortheast1StackProps) {
    super(scope, id, {
      ...props,
      description: "Markdown Memo Portal in ap-northeast-1",
      synthesizer:
        props.synthesizer ?? new cdk.CliCredentialsStackSynthesizer(),
    });

    // Cognito Hosted UI のドメインの取得
    const cognitoHostedUISubDomain = requireNonEmptyString(
      props.cognitoHostedUISubDomain,
      "cognitoHostedUISubDomain",
    );

    // Lambda 関数のビルドアーティファクトを保存するバケット名の取得
    const s3LambdaBucketName = requireS3BucketName(
      props.s3LambdaBucketName,
      "s3LambdaBucketName",
    );

    // SPA のビルドアーティファクトを保存するバケット名の取得
    const s3SpaBucketName = requireS3BucketName(
      props.s3SpaBucketName,
      "s3SpaBucketName",
    );

    // WAF Web ACL の ARN の取得
    const wafWebAclArn = requireNonEmptyString(
      props.wafWebAclArn,
      "wafWebAclArn",
    );

    // Lambda@Edge Viewer Request バージョンの ARN の取得
    const lambdaEdgeViewerRequestVersionArn = requireNonEmptyString(
      props.lambdaEdgeViewerRequestVersionArn,
      "lambdaEdgeViewerRequestVersionArn",
    );

    // AWS Backup の IAM ロール
    const backupRole = new iam.CfnRole(this, "MkmemoportalBackupRole", {
      roleName: "mkmemoportal-iam-role-backup",
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "backup.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup",
        "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores",
      ],
    });
    setLogicalId(backupRole, "MkmemoportalBackupRole");

    // DynamoDB テーブル
    const table = new dynamodb.CfnTable(this, "MkmemoportalDynamodb", {
      tableName: "mkmemoportal-dynamodb",
      billingMode: "PAY_PER_REQUEST",
      attributeDefinitions: [
        { attributeName: "user_id", attributeType: "S" },
        { attributeName: "memo_id", attributeType: "S" },
      ],
      keySchema: [
        { attributeName: "user_id", keyType: "HASH" },
        { attributeName: "memo_id", keyType: "RANGE" },
      ],
    });
    setLogicalId(table, "MkmemoportalDynamodb");

    // Lambda 関数の IAM ロール
    const lambdaRole = new iam.CfnRole(this, "MkmemoportalIAMRoleLambda", {
      roleName: "mkmemoportal-iam-role-lambda",
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: ["lambda.amazonaws.com"] },
            Action: ["sts:AssumeRole"],
          },
        ],
      },
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      ],
      policies: [
        {
          policyName: "mkmemoportal-dynamodb-access",
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "dynamodb:PutItem",
                  "dynamodb:GetItem",
                  "dynamodb:UpdateItem",
                  "dynamodb:DeleteItem",
                  "dynamodb:Query",
                  "dynamodb:Scan",
                ],
                Resource: table.attrArn,
              },
            ],
          },
        },
      ],
    });
    setLogicalId(lambdaRole, "MkmemoportalIAMRoleLambda");

    // SPA のビルドアーティファクトを保存するバケット
    const spaBucket = new s3.CfnBucket(this, "MkmemoportalSpaBucket", {
      bucketName: s3SpaBucketName,
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      versioningConfiguration: { status: "Enabled" },
    });
    setLogicalId(spaBucket, "MkmemoportalSpaBucket");

    // AWS Backup バックアップボールト
    const backupVault = new backup.CfnBackupVault(
      this,
      "MkmemoportalBackupVault",
      {
        backupVaultName: "mkmemoportal-backup-vault",
      },
    );
    setLogicalId(backupVault, "MkmemoportalBackupVault");

    // AWS Backup バックアッププラン
    const backupPlan = new backup.CfnBackupPlan(
      this,
      "MkmemoportalBackupPlan",
      {
        backupPlan: {
          backupPlanName: "mkmemoportal-backup-plan",
          backupPlanRule: [
            {
              ruleName: "DailyBackupRule",
              targetBackupVault: backupVault.ref,
              scheduleExpression: "cron(0 18 * * ? *)",
              lifecycle: { deleteAfterDays: 3 },
              startWindowMinutes: 60,
              completionWindowMinutes: 180,
            },
          ],
        },
      },
    );
    setLogicalId(backupPlan, "MkmemoportalBackupPlan");

    // AWS Backup バックアップセレクション
    const backupSelection = new backup.CfnBackupSelection(
      this,
      "MkmemoportalBackupSelection",
      {
        backupPlanId: backupPlan.ref,
        backupSelection: {
          selectionName: "mkmemoportal-dynamodb-selection",
          iamRoleArn: backupRole.attrArn,
          resources: [table.attrArn],
        },
      },
    );
    setLogicalId(backupSelection, "MkmemoportalBackupSelection");

    // CloudFront OAC
    const oac = new cloudfront.CfnOriginAccessControl(
      this,
      "MkmemoportalCloudfrontOAC",
      {
        originAccessControlConfig: {
          name: "mkmemoportal-cloudfront-oac",
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
        },
      },
    );
    setLogicalId(oac, "MkmemoportalCloudfrontOAC");

    // CloudFront ディストリビューション
    const distribution = new cloudfront.CfnDistribution(
      this,
      "MkmemoportalCloudfront",
      {
        distributionConfig: {
          enabled: true,
          defaultRootObject: "index.html",
          webAclId: wafWebAclArn,
          origins: [
            {
              id: "S3Origin",
              domainName: spaBucket.attrRegionalDomainName,
              s3OriginConfig: {
                originAccessIdentity: "",
              },
              originAccessControlId: oac.attrId,
            },
          ],
          defaultCacheBehavior: {
            targetOriginId: "S3Origin",
            viewerProtocolPolicy: "redirect-to-https",
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD"],
            forwardedValues: {
              queryString: true,
              cookies: {
                forward: "whitelist",
                whitelistedNames: [
                  "mkmemoportal_access_token",
                  "mkmemoportal_code_verifier",
                ],
              },
            },
            compress: true,
            minTtl: 0,
            defaultTtl: 0,
            maxTtl: 0,
            lambdaFunctionAssociations: [
              {
                eventType: "viewer-request",
                lambdaFunctionArn: lambdaEdgeViewerRequestVersionArn,
              },
            ],
          },
          customErrorResponses: [
            {
              errorCode: 403,
              responseCode: 200,
              responsePagePath: "/index.html",
            },
            {
              errorCode: 404,
              responseCode: 200,
              responsePagePath: "/index.html",
            },
          ],
          priceClass: "PriceClass_100",
          viewerCertificate: {
            cloudFrontDefaultCertificate: true,
          },
        },
      },
    );
    setLogicalId(distribution, "MkmemoportalCloudfront");

    // SPA のビルドアーティファクトを保存するバケットのバケットポリシー
    const spaBucketPolicy = new s3.CfnBucketPolicy(
      this,
      "MkmemoportalSpaBucketPolicy",
      {
        bucket: spaBucket.ref,
        policyDocument: {
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "cloudfront.amazonaws.com" },
              Action: "s3:GetObject",
              Resource: cdk.Fn.sub("${Arn}/*", { Arn: spaBucket.attrArn }),
              Condition: {
                StringEquals: {
                  "AWS:SourceArn": cdk.Fn.sub(
                    "arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${DistributionId}",
                    { DistributionId: distribution.ref },
                  ),
                },
              },
            },
          ],
        },
      },
    );
    setLogicalId(spaBucketPolicy, "MkmemoportalSpaBucketPolicy");

    // Cognito ユーザープール
    const userPool = new cognito.CfnUserPool(this, "MkmemoportalCognito", {
      userPoolName: "mkmemoportal-cognito",
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true,
      },
      schema: [
        {
          name: "email",
          required: true,
          mutable: false,
        },
      ],
      usernameAttributes: ["email"],
      autoVerifiedAttributes: ["email"],
      userPoolAddOns: {
        advancedSecurityMode: "ENFORCED",
      },
    });
    setLogicalId(userPool, "MkmemoportalCognito");

    // Cognito ユーザープールクライアント
    const userPoolClient = new cognito.CfnUserPoolClient(
      this,
      "MkmemoportalCognitoClient",
      {
        clientName: "mkmemoportal-cognito-client",
        userPoolId: userPool.ref,
        generateSecret: false,
        allowedOAuthFlowsUserPoolClient: true,
        allowedOAuthFlows: ["code"],
        allowedOAuthScopes: ["email", "openid", "profile"],
        callbackUrLs: [
          cdk.Fn.sub("https://${Domain}/", {
            Domain: distribution.attrDomainName,
          }),
        ],
        logoutUrLs: [
          cdk.Fn.sub("https://${Domain}/", {
            Domain: distribution.attrDomainName,
          }),
        ],
        supportedIdentityProviders: ["COGNITO"],
        accessTokenValidity: 12,
        idTokenValidity: 60,
        tokenValidityUnits: {
          accessToken: "hours",
          idToken: "minutes",
        },
        explicitAuthFlows: ["ALLOW_REFRESH_TOKEN_AUTH"],
        preventUserExistenceErrors: "ENABLED",
      },
    );
    setLogicalId(userPoolClient, "MkmemoportalCognitoClient");

    // Cognito ユーザープールドメイン
    const userPoolDomain = new cognito.CfnUserPoolDomain(
      this,
      "MkmemoportalCognitoDomain",
      {
        domain: cognitoHostedUISubDomain,
        userPoolId: userPool.ref,
      },
    );
    setLogicalId(userPoolDomain, "MkmemoportalCognitoDomain");

    // Cognito ユーザープールクライアント ID
    const ssmCognitoClientId = new ssm.CfnParameter(
      this,
      "MkmemoportalSsmCognitoClientId",
      {
        name: "/mkmemoportal/cognito/client_id",
        type: "String",
        value: userPoolClient.ref,
        description: "Cognito User Pool Client ID",
      },
    );
    setLogicalId(ssmCognitoClientId, "MkmemoportalSsmCognitoClientId");

    // Cognito ユーザープールドメイン
    const ssmCognitoDomain = new ssm.CfnParameter(
      this,
      "MkmemoportalSsmCognitoDomain",
      {
        name: "/mkmemoportal/cognito/domain",
        type: "String",
        value: cdk.Fn.sub("${Domain}.auth.${AWS::Region}.amazoncognito.com", {
          Domain: cognitoHostedUISubDomain,
        }),
        description: "Cognito Hosted UI Domain",
      },
    );
    setLogicalId(ssmCognitoDomain, "MkmemoportalSsmCognitoDomain");

    // CloudFront ドメイン
    const ssmCloudfrontDomain = new ssm.CfnParameter(
      this,
      "MkmemoportalSsmCloudfrontDomain",
      {
        name: "/mkmemoportal/cloudfront/domain",
        type: "String",
        value: distribution.attrDomainName,
        description: "CloudFront Domain",
      },
    );
    setLogicalId(ssmCloudfrontDomain, "MkmemoportalSsmCloudfrontDomain");

    // Lambda レイヤー
    const lambdaLayer = new lambda.CfnLayerVersion(
      this,
      "MkmemoportalLambdaLayer",
      {
        layerName: "mkmemoportal-lambda-layer",
        compatibleRuntimes: ["nodejs24.x"],
        content: {
          s3Bucket: s3LambdaBucketName,
          s3Key: "layer.zip",
        },
      },
    );
    setLogicalId(lambdaLayer, "MkmemoportalLambdaLayer");

    // API Gateway
    const api = new apigatewayv2.CfnApi(this, "MkmemoportalApig", {
      name: "mkmemoportal-apig",
      protocolType: "HTTP",
      corsConfiguration: {
        allowOrigins: [
          cdk.Fn.sub("https://${Domain}", {
            Domain: distribution.attrDomainName,
          }),
        ],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["*"],
        maxAge: 300,
      },
    });
    setLogicalId(api, "MkmemoportalApig");

    // API Gateway ステージ
    const apiStage = new apigatewayv2.CfnStage(this, "MkmemoportalApigStage", {
      apiId: api.ref,
      stageName: "$default",
      autoDeploy: true,
    });
    setLogicalId(apiStage, "MkmemoportalApigStage");

    // API Gateway 認証
    const authorizer = new apigatewayv2.CfnAuthorizer(
      this,
      "MkmemoportalApigAuthorizer",
      {
        apiId: api.ref,
        authorizerType: "JWT",
        name: "mkmemoportal-cognito-authorizer",
        identitySource: ["$request.header.Authorization"],
        jwtConfiguration: {
          audience: [userPoolClient.ref],
          issuer: cdk.Fn.sub(
            "https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPool}",
            { UserPool: userPool.ref },
          ),
        },
      },
    );
    setLogicalId(authorizer, "MkmemoportalApigAuthorizer");

    // Lambda 関数
    for (const definition of API_LAMBDAS) {
      const fn = new lambda.CfnFunction(this, definition.logicalId, {
        functionName: definition.functionName,
        runtime: "nodejs24.x",
        handler: definition.handler,
        role: lambdaRole.attrArn,
        code: {
          s3Bucket: s3LambdaBucketName,
          s3Key: definition.s3Key,
        },
        timeout: 10,
        memorySize: 256,
        layers: [lambdaLayer.ref],
      });
      setLogicalId(fn, definition.logicalId);

      const integration = new apigatewayv2.CfnIntegration(
        this,
        definition.integrationLogicalId,
        {
          apiId: api.ref,
          integrationType: "AWS_PROXY",
          integrationUri: cdk.Fn.sub(
            "arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${FnArn}/invocations",
            { FnArn: fn.attrArn },
          ),
          payloadFormatVersion: "2.0",
        },
      );
      setLogicalId(integration, definition.integrationLogicalId);

      const route = new apigatewayv2.CfnRoute(this, definition.routeLogicalId, {
        apiId: api.ref,
        routeKey: definition.routeKey,
        authorizationType: "JWT",
        authorizerId: authorizer.ref,
        target: cdk.Fn.sub("integrations/${IntegrationId}", {
          IntegrationId: integration.ref,
        }),
      });
      setLogicalId(route, definition.routeLogicalId);

      const permission = new lambda.CfnPermission(
        this,
        definition.permissionLogicalId,
        {
          action: "lambda:InvokeFunction",
          functionName: fn.ref,
          principal: "apigateway.amazonaws.com",
          sourceArn: cdk.Fn.sub(
            "arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*/*",
            { Api: api.ref },
          ),
        },
      );
      setLogicalId(permission, definition.permissionLogicalId);
    }

    // API Gateway エンドポイント
    const apiEndpointOutput = new cdk.CfnOutput(this, "ApiEndpoint", {
      description: "API Gateway endpoint URL for mkmemoportal-apig",
      value: api.attrApiEndpoint,
    });
    setLogicalId(apiEndpointOutput, "ApiEndpoint");

    // CloudFront ディストリビューション IDの出力
    const cloudFrontDistributionIdOutput = new cdk.CfnOutput(
      this,
      "CloudFrontDistributionId",
      {
        description: "CloudFront Distribution ID",
        value: distribution.ref,
      },
    );
    setLogicalId(cloudFrontDistributionIdOutput, "CloudFrontDistributionId");

    // Cognito ユーザープールクライアント IDの出力
    const cognitoClientIdOutput = new cdk.CfnOutput(this, "CognitoClientId", {
      description: "Cognito User Pool Client ID",
      value: userPoolClient.ref,
    });
    setLogicalId(cognitoClientIdOutput, "CognitoClientId");

    // Cognito ユーザープールドメインの出力
    const cognitoDomainOutput = new cdk.CfnOutput(this, "CognitoDomain", {
      description: "Cognito Hosted UI Domain",
      value: cdk.Fn.sub("${Domain}.auth.${AWS::Region}.amazoncognito.com", {
        Domain: cognitoHostedUISubDomain,
      }),
    });
    setLogicalId(cognitoDomainOutput, "CognitoDomain");

    // Markdown Memo Portal URLの出力
    const markdownMemoPortalUrlOutput = new cdk.CfnOutput(
      this,
      "MarkdownMemoPortalUrl",
      {
        description: "Markdown Memo Portal URL",
        value: cdk.Fn.sub("https://${Domain}", {
          Domain: distribution.attrDomainName,
        }),
      },
    );
    setLogicalId(markdownMemoPortalUrlOutput, "MarkdownMemoPortalUrl");
  }
}
