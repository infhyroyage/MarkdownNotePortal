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
  return (
    <div className="w-1/2 flex flex-col border-r border-base-300">
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none"
        value={props.markdownContent}
        onChange={props.handleMarkdownContentChange}
        placeholder="Enter your markdown here..."
      />
    </div>
  );
}
