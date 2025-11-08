import type { JSX } from "react";
import type { SaveStatusIconProps } from "../types/props";

/**
 * 保存状態のアイコンを表示するコンポーネント
 * @param {SaveStatusIconProps} props 保存状態のアイコンを表示するコンポーネントのProps
 * @returns {JSX.Element} 保存状態のアイコンを表示するコンポーネント
 */
export default function SaveStatusIcon(
  props: SaveStatusIconProps
): JSX.Element {
  const { saveStatus } = props;

  return saveStatus === "saving" ? (
    <span className="loading loading-spinner loading-xs" />
  ) : saveStatus === "saved" ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-success"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-base-content opacity-50"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}
