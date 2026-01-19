import type { JSX } from "react";
import AuthenticatedDisplay from "./components/AuthenticatedDisplay";

/**
 * アプリケーションのエントリーポイント
 * @returns {JSX.Element} アプリケーションのエントリーポイント
 */
export default function App(): JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      <AuthenticatedDisplay />
    </div>
  );
}
