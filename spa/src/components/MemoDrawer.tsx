import type { JSX } from "react";
import type { MemoDrawerProps } from "../types/props";

/**
 * メモのリストを表示するドロワーコンポーネント
 * @param {MemoDrawerProps} props メモドロワーコンポーネントのProps
 * @returns {JSX.Element} メモドロワーコンポーネント
 */
export default function MemoDrawer(props: MemoDrawerProps): JSX.Element {
  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-base-200 shadow-lg transition-transform duration-300 z-20 ${
        props.isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ width: "250px" }}
    >
      <div className="h-full overflow-y-auto">
        <ul className="menu w-full p-0">
          {props.memos.map((memo) => (
            <li key={memo.id} className="w-full">
              <button
                type="button"
                className={`w-full text-left px-4 py-3 rounded-none ${
                  props.selectedMemoId === memo.id ? "active" : ""
                }`}
                onClick={() => props.onSelectMemo(memo.id)}
              >
                {memo.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
