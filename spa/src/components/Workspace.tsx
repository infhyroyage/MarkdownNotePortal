import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { WorkspaceProps } from "../types/props";
import type { Memo } from "../types/state";
import NewMemoButton from "./NewMemoButton";
import WorkspaceEditor from "./WorkspaceEditor";

// メモ選択時にWorkspacePreviewを遅延ロードすることでビルドアーティファクトのファイルサイズを削減
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
  } = props;

  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragSessionRef = useRef<{
    pointerId: number;
    el: HTMLDivElement;
    onMove: (ev: PointerEvent) => void;
    onEnd: (ev: PointerEvent) => void;
  } | null>(null);

  const cleanupSeparatorDrag = useCallback(
    (pointerId?: number): void => {
      const session = dragSessionRef.current;
      if (!session) return;
      if (pointerId !== undefined && session.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", session.onMove);
      window.removeEventListener("pointerup", session.onEnd);
      window.removeEventListener("pointercancel", session.onEnd);
      if (session.el.hasPointerCapture(session.pointerId)) {
        session.el.releasePointerCapture(session.pointerId);
      }
      dragSessionRef.current = null;
      setIsDragging(false);
    },
    [],
  );

  const applyResizeFromClient = useCallback(
    (clientX: number, clientY: number): void => {
      if (layoutMode === "horizontal") {
        const newWidth = (clientX / window.innerWidth) * 100;
        if (newWidth >= 20 && newWidth <= 80) {
          setEditorWidthPercent(newWidth);
        }
      } else {
        const header = document.querySelector("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const availableHeight = window.innerHeight - headerHeight;
        const newHeight = ((clientY - headerHeight) / availableHeight) * 100;
        if (newHeight >= 20 && newHeight <= 80) {
          setEditorWidthPercent(newHeight);
        }
      }
    },
    [layoutMode],
  );

  useEffect(() => {
    return () => {
      cleanupSeparatorDrag();
    };
  }, [cleanupSeparatorDrag]);

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

  // 境界線のドラッグ時のリサイズ（Pointer Events でマウス・タッチ・ペンを統一）
  const handlePointerDownBorderLine = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      if (dragSessionRef.current !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      applyResizeFromClient(e.clientX, e.clientY);

      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) return;
        applyResizeFromClient(ev.clientX, ev.clientY);
      };
      const onEnd = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) return;
        cleanupSeparatorDrag(pointerId);
      };

      dragSessionRef.current = { pointerId, el, onMove, onEnd };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      setIsDragging(true);
    },
    [applyResizeFromClient, cleanupSeparatorDrag],
  );

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
        {isLoadingMemos || isLoadingMemoDetail ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : selectedMemo !== undefined ? (
          <>
            <WorkspaceEditor
              markdownContent={selectedMemo.content ?? ""}
              onChange={handleMarkdownContentChange}
              layoutMode={layoutMode}
              widthPercent={editorWidthPercent}
            />
            <div
              className={`shrink-0 touch-none select-none transition-colors ${
                isDragging ? "bg-primary" : "bg-base-content/20 hover:bg-primary"
              } ${
                layoutMode === "horizontal"
                  ? "w-1 cursor-col-resize pointer-coarse:w-4 pointer-coarse:min-w-4"
                  : "h-1 cursor-row-resize pointer-coarse:h-4 pointer-coarse:min-h-4"
              }`}
              onPointerDown={handlePointerDownBorderLine}
              onLostPointerCapture={(ev: ReactPointerEvent<HTMLDivElement>) => {
                cleanupSeparatorDrag(ev.pointerId);
              }}
              onDoubleClick={handleDoubleClickBorderLine}
              role="separator"
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
