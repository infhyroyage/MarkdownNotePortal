import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { DrawerMemoButtonProps } from "../types/props";
import { formatDateTime } from "../utils/date";

/**
 * ドロワーのメモボタンコンポーネント
 * @param {DrawerMemoButtonProps} props ドロワーのメモボタンコンポーネントのProps
 * @returns {JSX.Element} ドロワーのメモボタンコンポーネント
 */
export default function DrawerMemoButton(
  props: DrawerMemoButtonProps
): JSX.Element {
  const { memoId, isSelected, memoTitle, lastUpdatedAt, onDeleteClick, onSelectMemo } = props;

  // 相対時間をリアルタイムで更新するためのstate
  const [, setCurrentTime] = useState(Date.now());

  // 1秒ごとに現在時刻を更新して再レンダリングを発生させる
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // クリーンアップ: コンポーネントがアンマウントされる際にタイマーをクリア
    return () => {
      clearInterval(intervalId);
    };
  }, []);

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
