import type { JSX } from "react";
import type { LayoutToggleButtonProps } from "../types/props";

/**
 * レイアウト切り替えボタンを表示するコンポーネント
 * @param {LayoutToggleButtonProps} props レイアウト切り替えボタンのProps
 * @returns {JSX.Element} レイアウト切り替えボタンを表示するコンポーネント
 */
export default function LayoutToggleButton(
  props: LayoutToggleButtonProps
): JSX.Element {
  const { layoutMode, onToggleLayout } = props;

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={onToggleLayout}
      title={
        layoutMode === "horizontal"
          ? "Switch to vertical layout"
          : "Switch to horizontal layout"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-5 h-5"
      >
        {layoutMode === "horizontal" ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v12a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18V6z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 3.75A2.25 2.25 0 013.75 6v2.25A2.25 2.25 0 016 10.5h12a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75H6zM6 13.5a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18v-2.25A2.25 2.25 0 0018 13.5H6z"
          />
        )}
      </svg>
    </button>
  );
}
