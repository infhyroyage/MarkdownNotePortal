import type { ChangeEvent, JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import type { Memo } from "../types/state";
import { INITIAL_MARKDOWN_CONTENT, INITIAL_MEMO_TITLE } from "../utils/const";
import Drawer from "./Drawer";
import Header from "./Header";
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

  const selectedMemo: Memo | undefined = useMemo<Memo | undefined>(
    () => memos.find((memo: Memo) => memo.id === selectedMemoId),
    [memos, selectedMemoId]
  );
  const markdownContent: string = useMemo<string>(
    () => selectedMemo?.content ?? INITIAL_MARKDOWN_CONTENT,
    [selectedMemo]
  );

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newContent = e.target.value;
      setMemos((prevMemos) =>
        prevMemos.map((memo) =>
          memo.id === selectedMemoId ? { ...memo, content: newContent } : memo
        )
      );
    },
    [selectedMemoId]
  );

  const handleSelectMemo = useCallback((memoId: string): void => {
    setSelectedMemoId(memoId);
  }, []);

  const handleToggleDrawer = useCallback((): void => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title={selectedMemo?.title ?? "Markdown Note Portal"}
        onToggleDrawer={handleToggleDrawer}
        isDrawerOpen={isDrawerOpen}
      />
      <Drawer
        memos={memos}
        selectedMemoId={selectedMemoId}
        onSelectMemo={handleSelectMemo}
        isOpen={isDrawerOpen}
        onCloseDrawer={handleToggleDrawer}
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
