import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import type { WorkspaceProps } from "../types/props";
import type { Memo } from "../types/state";
import NewMemoButton from "./NewMemoButton";
import WorkspaceEditor from "./WorkspaceEditor";
import WorkspacePreview from "./WorkspacePreview";

/**
 * ワークスペースを表示するコンポーネント
 * @returns {JSX.Element} ワークスペースを表示するコンポーネント
 */
export default function Workspace(props: WorkspaceProps): JSX.Element {
  const {
    autoSaveTimer,
    layoutMode,
    isLoadingMemos,
    onClickButton,
    saveMemo,
    selectedMemo,
    selectedMemoId,
    setAutoSaveTimer,
    setMemos,
  } = props;

  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // ドラッグ＆ドロップでエディターのサイズ(画面のパーセンテージ)を動的に調整
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent): void => {
        if (!isDragging) return;

        if (layoutMode === "horizontal") {
          // 左右配置モード：横方向のリサイズ
          const newWidth = (e.clientX / window.innerWidth) * 100;
          // エディターの幅(画面幅のパーセンテージ)を最小20%、最大80%に制限
          if (newWidth >= 20 && newWidth <= 80) {
            setEditorWidthPercent(newWidth);
          }
        } else {
          // 上下配置モード：縦方向のリサイズ
          // ヘッダーの高さを取得して除外
          const header = document.querySelector("header");
          const headerHeight = header ? header.offsetHeight : 0;
          const availableHeight = window.innerHeight - headerHeight;
          const newHeight =
            ((e.clientY - headerHeight) / availableHeight) * 100;
          // エディターの高さ(利用可能な高さのパーセンテージ)を最小20%、最大80%に制限
          if (newHeight >= 20 && newHeight <= 80) {
            setEditorWidthPercent(newHeight);
          }
        }
      };

      const handleMouseUp = (): void => setIsDragging(false);

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, layoutMode]);

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newContent = e.target.value;
      setMemos((prevMemos: Memo[]) =>
        prevMemos.map((memo: Memo) =>
          memo.id === selectedMemoId ? { ...memo, content: newContent } : memo
        )
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
              (memo: Memo) => memo.id === selectedMemoId
            );
            if (currentMemo) {
              saveMemo(selectedMemoId, currentMemo.title, currentMemo.content);
            }
            return currentMemos;
          });
        }, 3000);
        setAutoSaveTimer(timer);
      }
    },
    [autoSaveTimer, saveMemo, selectedMemoId, setAutoSaveTimer, setMemos]
  );

  // 境界線のドラッグ&ドロップ時のリサイズ処理
  const handleMouseDownBorderLine = useCallback((): void => {
    setIsDragging(true);
  }, []);

  // 境界線のダブルクリック時のリセット処理
  const handleDoubleClickBorderLine = useCallback((): void => {
    setEditorWidthPercent(50);
  }, []);

  return (
    <main className="flex-1 overflow-hidden">
      <div
        className={
          layoutMode === "horizontal" ? "flex h-full" : "flex flex-col h-full"
        }
      >
        {isLoadingMemos ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : selectedMemo !== undefined ? (
          <>
            <WorkspaceEditor
              markdownContent={selectedMemo.content}
              onChange={handleMarkdownContentChange}
              layoutMode={layoutMode}
              widthPercent={editorWidthPercent}
            />
            <div
              className={`bg-base-content/20 hover:bg-primary shrink-0 transition-colors ${
                layoutMode === "horizontal"
                  ? "w-1 cursor-col-resize"
                  : "h-1 cursor-row-resize"
              }`}
              onMouseDown={handleMouseDownBorderLine}
              onDoubleClick={handleDoubleClickBorderLine}
              role="separator"
            />
            <WorkspacePreview
              markdownContent={selectedMemo.content}
              layoutMode={layoutMode}
              widthPercent={100 - editorWidthPercent}
            />
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
            <NewMemoButton onClick={onClickButton} />
          </div>
        )}
      </div>
    </main>
  );
}
