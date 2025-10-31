import type { JSX } from "react";
import ReactMarkdown from "react-markdown";
import type { WorkspacePreviewProps } from "../types/props";

/**
 * ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネント
 * @param {WorkspacePreviewProps} props ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネントのProps
 * @returns {JSX.Element} ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネント
 */
export default function WorkspacePreview(
  props: WorkspacePreviewProps
): JSX.Element {
  return (
    <div className="w-1/2 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none p-4">
          <ReactMarkdown>{props.markdownContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
