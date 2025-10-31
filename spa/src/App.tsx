import type { JSX } from "react";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import NowAuthenticating from "./components/NowAuthenticating";
import Workspace from "./components/Workspace";
import {
  getLoginUrl,
  issueAccessToken,
  isTokenValid,
  SESSION_STORAGE_CODE_VERIFIER_KEY,
  SESSION_STORAGE_TOKEN_KEY,
} from "./utils/auth";

/**
 * アプリケーションのエントリーポイント
 * @returns {JSX.Element} アプリケーションのエントリーポイント
 */
export default function App(): JSX.Element {
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);

  // アクセストークンが有効ではない場合は、Cognito Hosted UIのログインページにリダイレクト
  useEffect(() => {
    (async () => {
      // ローカル環境ではスキップ
      if (import.meta.env.DEV) {
        setIsAuthenticating(false);
        return;
      }

      try {
        // URLパラメータからAuthorization Codeを取得
        const code: string | null = new URLSearchParams(
          window.location.search
        ).get("code");

        if (code) {
          // PKCEフロー用のcode_verifierを取得
          // 取得できない場合は、Cognito Hosted UIのログインページにリダイレクト
          const codeVerifier: string | null = sessionStorage.getItem(
            SESSION_STORAGE_CODE_VERIFIER_KEY
          );
          if (!codeVerifier) {
            window.location.href = await getLoginUrl();
            return;
          }

          // アクセストークンを取得してSession Storageに保存
          const accessToken: string = await issueAccessToken(
            code,
            codeVerifier
          );
          sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, accessToken);

          // PKCEフロー用のcode_verifierは用済みのため削除
          sessionStorage.removeItem(SESSION_STORAGE_CODE_VERIFIER_KEY);

          // URLからcodeパラメータを削除してリダイレクト
          window.history.replaceState({}, document.title, "/");
          setIsAuthenticating(false);
        } else {
          // codeがない場合、既存のアクセストークンが有効かをチェックし、
          // 有効でない場合のみ、Cognito Hosted UIのログインページにリダイレクト
          const accessToken: string | null = sessionStorage.getItem(
            SESSION_STORAGE_TOKEN_KEY
          );
          if (isTokenValid(accessToken)) {
            setIsAuthenticating(false);
          } else {
            window.location.href = await getLoginUrl();
          }
        }
      } catch {
        // 異常時は、Cognito Hosted UIのログインページにリダイレクト
        window.location.href = await getLoginUrl();
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        {isAuthenticating ? <NowAuthenticating /> : <Workspace />}
      </main>
    </div>
  );
}
