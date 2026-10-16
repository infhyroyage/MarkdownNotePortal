import { AuthenticationError } from "@layer/errors.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDynamoDBClient, getUserId } from "../../layer/nodejs/utils.js";
import type { APIGatewayEvent } from "../../types/api_gateway.js";

describe("utils", () => {
  describe("getDynamoDBClient", () => {
    beforeEach(() => {
      delete process.env.DYNAMODB_ENDPOINT;
    });

    it("ローカル環境のDynamoDBクライアントを返す", () => {
      process.env.DYNAMODB_ENDPOINT = "http://localhost:8000";
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });

    it("AWS環境のDynamoDBクライアントを返す", () => {
      const client = getDynamoDBClient();
      expect(client).toBeDefined();
    });
  });

  describe("getUserId", () => {
    const originalIsLocal = process.env.IS_LOCAL;

    afterEach(() => {
      if (originalIsLocal) {
        process.env.IS_LOCAL = originalIsLocal;
      } else {
        delete process.env.IS_LOCAL;
      }
    });

    it('ローカル環境の場合は"local_user"を返す', () => {
      process.env.IS_LOCAL = "true";
      const event: APIGatewayEvent = {};
      const userId = getUserId(event);
      expect(userId).toBe("local_user");
    });

    it("AWS環境で認証情報が存在する場合はuser_idを返す", () => {
      delete process.env.IS_LOCAL;
      const event: APIGatewayEvent = {
        requestContext: {
          authorizer: {
            jwt: {
              claims: {
                sub: "test-user-id",
              },
            },
          },
        },
      };
      const userId = getUserId(event);
      expect(userId).toBe("test-user-id");
    });

    it("AWS環境で認証情報が存在しない場合はAuthenticationErrorを投げる", () => {
      delete process.env.IS_LOCAL;
      const event: APIGatewayEvent = {};
      expect(() => getUserId(event)).toThrow(AuthenticationError);
    });

    describe("Cognitoトークンへのクレーム追加(acr/amr)に対する前方互換性", () => {
      /**
       * JWTクレームからAPI Gatewayイベントを生成する
       * @param {Record<string, unknown>} claims JWTオーソライザーがLambdaへ渡すクレーム
       * @returns {APIGatewayEvent} API Gatewayイベント
       */
      function createEventWithClaims(
        claims: Record<string, unknown>,
      ): APIGatewayEvent {
        return {
          requestContext: { authorizer: { jwt: { claims } } },
        } as APIGatewayEvent;
      }

      beforeEach(() => {
        delete process.env.IS_LOCAL;
      });

      // Given: HTTP APIのJWTオーソライザーが配列クレームを"[pwd otp mfa]"形式の文字列に変換したクレーム
      // When: getUserIdを呼び出す
      // Then: acr/amrを無視してsubを返す
      it("TC-U-N-01: 文字列化されたamrとacrを含む場合はsubを返す", () => {
        const event = createEventWithClaims({
          sub: "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
          token_use: "access",
          scope: "openid email profile",
          acr: "urn:cognito:loa:4",
          amr: "[pwd otp mfa]",
        });

        const userId = getUserId(event);

        expect(userId).toBe("a1b2c3d4-5678-90ab-cdef-EXAMPLE11111");
      });

      // Given: amrがJSON配列のまま渡され、未知のクレームも含むクレーム
      // When: getUserIdを呼び出す
      // Then: 認識できないクレームを無視してsubを返す
      it("TC-U-N-02: 配列のamrと未知のクレームを含む場合はsubを返す", () => {
        const event = createEventWithClaims({
          sub: "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
          acr: "urn:cognito:loa:1",
          amr: ["pwd"],
          "future:object_claim": { level: { values: ["a", "b"] } },
        });

        const userId = getUserId(event);

        expect(userId).toBe("a1b2c3d4-5678-90ab-cdef-EXAMPLE11111");
      });

      // Given: acr/amrは含むがsubを含まないクレーム
      // When: getUserIdを呼び出す
      // Then: acr/amrをユーザー識別に使わず、AuthenticationErrorを投げる
      it("TC-U-A-01: acr/amrを含むがsubがない場合はAuthenticationErrorを投げる", () => {
        const event = createEventWithClaims({
          acr: "urn:cognito:loa:4",
          amr: "[pwd otp mfa]",
        });

        expect(() => getUserId(event)).toThrow(AuthenticationError);
        expect(() => getUserId(event)).toThrow("Not authenticated");
      });

      // Given: acr/amrを含みsubが空文字のクレーム
      // When: getUserIdを呼び出す
      // Then: AuthenticationErrorを投げる
      it("TC-U-B-01: acr/amrを含みsubが空文字の場合はAuthenticationErrorを投げる", () => {
        const event = createEventWithClaims({
          sub: "",
          acr: "urn:cognito:loa:4",
          amr: "[pwd otp mfa]",
        });

        expect(() => getUserId(event)).toThrow(AuthenticationError);
        expect(() => getUserId(event)).toThrow("Not authenticated");
      });

      // Given: acr/amrを含みsubがnullのクレーム
      // When: getUserIdを呼び出す
      // Then: AuthenticationErrorを投げる
      it("TC-U-B-02: acr/amrを含みsubがnullの場合はAuthenticationErrorを投げる", () => {
        const event = createEventWithClaims({
          sub: null,
          acr: "urn:cognito:loa:4",
          amr: "[pwd otp mfa]",
        });

        expect(() => getUserId(event)).toThrow(AuthenticationError);
        expect(() => getUserId(event)).toThrow("Not authenticated");
      });
    });
  });

  describe("AuthenticationError", () => {
    it("エラーメッセージが正しく設定される", () => {
      const error = new AuthenticationError("Test error");
      expect(error.name).toBe("AuthenticationError");
      expect(error.message).toBe("Test error");
    });
  });
});
