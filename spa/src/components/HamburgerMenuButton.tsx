import type { JSX } from "react";
import type { HamburgerMenuButtonProps } from "../types/props";

/**
 * ハンバーガーメニューボタンを表示するコンポーネント
 * @param {HamburgerMenuButtonProps} props ハンバーガーメニューボタンを表示するコンポーネントのProps
 * @returns {JSX.Element} ハンバーガーメニューボタンを表示するコンポーネント
 */
export default function HamburgerMenuButton(
  props: HamburgerMenuButtonProps
): JSX.Element {
  const { onToggleDrawer, isDrawerOpen } = props;

  return (
    <button
      type="button"
      className="btn btn-square btn-ghost"
      onClick={onToggleDrawer}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className="inline-block w-5 h-5 stroke-current"
      >
        <line
          x1="4"
          y1="6"
          x2="20"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transition: "transform 0.3s ease",
            transformOrigin: "center",
          }}
          transform={isDrawerOpen ? "rotate(45) translate(0, 6)" : ""}
        />
        <line
          x1="4"
          y1="12"
          x2="20"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transition: "opacity 0.3s ease",
            opacity: isDrawerOpen ? 0 : 1,
          }}
        />
        <line
          x1="4"
          y1="18"
          x2="20"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transition: "transform 0.3s ease",
            transformOrigin: "center",
          }}
          transform={isDrawerOpen ? "rotate(-45) translate(0, -6)" : ""}
        />
      </svg>
    </button>
  );
}
