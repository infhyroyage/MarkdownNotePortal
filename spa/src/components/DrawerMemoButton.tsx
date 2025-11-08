import type { JSX } from "react";
import type { DrawerMemoButtonProps } from "../types/props";

/**
 * ドロワーのメモボタンコンポーネント
 * @param {DrawerMemoButtonProps} props ドロワーのメモボタンコンポーネントのProps
 * @returns {JSX.Element} ドロワーのメモボタンコンポーネント
 */
export default function DrawerMemoButton(
  props: DrawerMemoButtonProps
): JSX.Element {
  const { memoId, isSelected, memoTitle, onDeleteClick, onSelectMemo } = props;

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
          <div className="flex items-center gap-2">
            {isSelected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={isSelected ? "text-primary" : ""}>
              {memoTitle}
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
