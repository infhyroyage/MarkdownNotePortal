import {
  lazy,
  Suspense,
  useCallback,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import type { WorkspaceProps } from "../types/props";
import type { Memo } from "../types/state";
import NewMemoButton from "./NewMemoButton";
import WorkspaceBorderLine from "./WorkspaceBorderLine";
import WorkspaceEditor from "./WorkspaceEditor";

// メモ選択時にWorkspacePreviewを遅延ロードすることで、
// ビルドアーティファクトのファイルサイズを削減
const WorkspacePreview = lazy(() => import("./WorkspacePreview"));

/**
 * ワークスペースを表示するコンポーネント
 * @returns {JSX.Element} ワークスペースを表示するコンポーネント
 */
export default function Workspace(props: WorkspaceProps): JSX.Element {
  const {
    autoSaveTimer,
    isCreatingMemo,
    layoutMode,
    isLoadingMemos,
    isLoadingMemoDetail,
    onClickNewMemoButton,
    saveMemo,
    selectedMemo,
    selectedMemoId,
    setAutoSaveTimer,
    setMemos,
    markdownEditorRef,
    previewRef,
  } = props;

  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newContent = e.target.value;
      setMemos((prevMemos: Memo[]) =>
        prevMemos.map((memo: Memo) =>
          memo.id === selectedMemoId ? { ...memo, content: newContent } : memo,
        ),
      );

      // 既存のタイマーをキャンセル
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // 3秒後に自動保存
      if (selectedMemoId) {
        const timer = setTimeout(() => {
          setMemos((currentMemos: Memo[]) => {
            const currentMemo = currentMemos.find(
              (memo: Memo) => memo.id === selectedMemoId,
            );
            if (currentMemo && currentMemo.content !== undefined) {
              saveMemo(selectedMemoId, currentMemo.title, currentMemo.content);
            }
            return currentMemos;
          });
        }, 3000);
        setAutoSaveTimer(timer);
      }
    },
    [autoSaveTimer, saveMemo, selectedMemoId, setAutoSaveTimer, setMemos],
  );

  return (
    <main className="flex-1 overflow-hidden">
      <div
        className={
          layoutMode === "horizontal" ? "flex h-full" : "flex flex-col h-full"
        }
      >
        {isLoadingMemos || isLoadingMemoDetail ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : selectedMemo !== undefined ? (
          <>
            <WorkspaceEditor
              markdownContent={selectedMemo.content ?? ""}
              markdownEditorRef={markdownEditorRef}
              onChange={handleMarkdownContentChange}
              layoutMode={layoutMode}
              widthPercent={editorWidthPercent}
            />
            <WorkspaceBorderLine
              layoutMode={layoutMode}
              setEditorWidthPercent={setEditorWidthPercent}
            />
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center"
                  style={
                    layoutMode === "horizontal"
                      ? { width: `${100 - editorWidthPercent}%` }
                      : { height: `${100 - editorWidthPercent}%` }
                  }
                >
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              }
            >
              <WorkspacePreview
                markdownContent={selectedMemo.content ?? ""}
                layoutMode={layoutMode}
                previewRef={previewRef}
                widthPercent={100 - editorWidthPercent}
              />
            </Suspense>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 text-base-content/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3l18 18"
              />
            </svg>
            <p className="text-lg text-base-content/70 mb-6">No memo yet</p>
            <NewMemoButton
              onClick={onClickNewMemoButton}
              isLoading={isCreatingMemo}
            />
          </div>
        )}
      </div>
    </main>
  );
}
