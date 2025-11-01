import type { ChangeEvent, JSX } from "react";
import { useCallback, useState } from "react";
import { INITIAL_MARKDOWN_CONTENT, INITIAL_MEMO_TITLE } from "../utils/const";
import type { Memo } from "../types/state";
import Header from "./Header";
import MemoDrawer from "./MemoDrawer";
import WorkspaceEditor from "./WorkspaceEditor";
import WorkspacePreview from "./WorkspacePreview";

/**
 * ワークスペースを表示するコンポーネント
 * @returns {JSX.Element} ワークスペースを表示するコンポーネント
 */
export default function Workspace(): JSX.Element {
  const [memos, setMemos] = useState<Memo[]>([
    {
      id: "initial-memo",
      title: INITIAL_MEMO_TITLE,
      content: INITIAL_MARKDOWN_CONTENT,
    },
  ]);

  const [selectedMemoId, setSelectedMemoId] = useState<string>("initial-memo");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  const selectedMemo = memos.find((memo) => memo.id === selectedMemoId);
  const markdownContent = selectedMemo?.content ?? "";

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setMemos((prevMemos) =>
        prevMemos.map((memo) =>
          memo.id === selectedMemoId ? { ...memo, content: newContent } : memo
        )
      );
    },
    [selectedMemoId]
  );

  const handleSelectMemo = useCallback((memoId: string) => {
    setSelectedMemoId(memoId);
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header onToggleDrawer={handleToggleDrawer} />
      <MemoDrawer
        memos={memos}
        selectedMemoId={selectedMemoId}
        onSelectMemo={handleSelectMemo}
        isOpen={isDrawerOpen}
      />
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
