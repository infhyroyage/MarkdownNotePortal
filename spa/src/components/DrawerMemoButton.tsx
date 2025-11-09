import type { JSX } from "react";
import type { DrawerMemoButtonProps } from "../types/props";

/**
 * 日時を相対時間表示にフォーマット（英語）
 * @param {string} isoString ISO形式の日時文字列
 * @returns {string} 相対時間表示の文字列（例: "3 seconds ago", "5 minutes ago"）
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 未来の日時の場合は "just now" を返す
  if (diffInSeconds < 0) {
    return "just now";
  }

  // 60秒未満
  if (diffInSeconds < 60) {
    return diffInSeconds === 1 ? "1 second ago" : `${diffInSeconds} seconds ago`;
  }

  // 60分未満
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 minute ago" : `${diffInMinutes} minutes ago`;
  }

  // 24時間未満
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  // 30日未満
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  // 365日未満
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  // 365日以上
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

/**
 * ドロワーのメモボタンコンポーネント
 * @param {DrawerMemoButtonProps} props ドロワーのメモボタンコンポーネントのProps
 * @returns {JSX.Element} ドロワーのメモボタンコンポーネント
 */
export default function DrawerMemoButton(
  props: DrawerMemoButtonProps
): JSX.Element {
  const { memoId, isSelected, memoTitle, lastUpdatedAt, onDeleteClick, onSelectMemo } = props;

  return (
    <li key={memoId} className="w-full">
      <div
        className={`flex items-center w-full p-0 ${
          isSelected ? "border-l-4 border-primary bg-primary/10" : ""
        }`}
      >
        <button
          type="button"
          className={`flex-1 text-left px-4 py-3 rounded-none ${
            isSelected ? "active font-bold" : "font-normal hover:bg-base-200"
          }`}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onSelectMemo(memoId);
          }}
        >
          <div className="flex flex-col gap-1">
            <span className={isSelected ? "text-primary" : ""}>
              {memoTitle}
            </span>
            <span className="text-xs text-base-content/60">
              {formatDateTime(lastUpdatedAt)}
            </span>
          </div>
        </button>
        <button
          type="button"
          className="btn btn-outline btn-error btn-sm btn-square mr-2"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onDeleteClick(memoId);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}
