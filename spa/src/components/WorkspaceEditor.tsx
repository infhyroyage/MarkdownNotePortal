import type { JSX } from "react";
import type { WorkspaceEditorProps } from "../types/props";

/**
 * ワークスペースの左側にあるMarkdownエディターを表示するコンポーネント
 * @param {WorkspaceEditorProps} props ワークスペースの左側にあるMarkdownエディターを表示するコンポーネントのProps
 * @returns {JSX.Element} ワークスペースの左側にあるMarkdownエディターを表示するコンポーネント
 */
export default function WorkspaceEditor(
  props: WorkspaceEditorProps
): JSX.Element {
  const { layoutMode, markdownContent, onChange, widthPercent } = props;

  return (
    <div
      className="flex flex-col"
      style={
        layoutMode === "horizontal"
          ? { width: `${widthPercent}%` }
          : { height: `${widthPercent}%` }
      }
    >
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none"
        value={markdownContent}
        onChange={onChange}
        autoComplete="off"
        placeholder="Enter your markdown here..."
      />
    </div>
  );
}
