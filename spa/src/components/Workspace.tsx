import type { ChangeEvent, JSX } from "react";
import { useCallback, useState } from "react";
import { INITIAL_MARKDOWN_CONTENT } from "../utils/const";
import Header from "./Header";
import WorkspaceEditor from "./WorkspaceEditor";
import WorkspacePreview from "./WorkspacePreview";

/**
 * ワークスペースを表示するコンポーネント
 * @returns {JSX.Element} ワークスペースを表示するコンポーネント
 */
export default function Workspace(): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState<string>(
    INITIAL_MARKDOWN_CONTENT
  );

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdownContent(e.target.value);
    },
    [setMarkdownContent]
  );

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <WorkspaceEditor
            markdownContent={markdownContent}
            handleMarkdownContentChange={handleMarkdownContentChange}
          />
          <WorkspacePreview markdownContent={markdownContent} />
        </div>
      </main>
    </div>
  );
}
