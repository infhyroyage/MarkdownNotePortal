import type { ChangeEvent, JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutMode, Memo, SaveStatus } from "../types/state";
import { getErrorMessage, listMemos } from "../utils/api";
import { DEFAULT_MEMO_CONTENT, DEFAULT_MEMO_TITLE } from "../utils/const";
import Drawer from "./Drawer";
import ErrorAlert from "./ErrorAlert";
import Header from "./Header";
import WorkspaceEditor from "./WorkspaceEditor";
import WorkspacePreview from "./WorkspacePreview";

/**
 * ワークスペースを表示するコンポーネント
 * @returns {JSX.Element} ワークスペースを表示するコンポーネント
 */
export default function Workspace(): JSX.Element {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState<boolean>(true);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");

  // 選択されたメモを取得
  const selectedMemo: Memo | undefined = useMemo<Memo | undefined>(
    () => memos.find((memo: Memo) => memo.id === selectedMemoId),
    [memos, selectedMemoId]
  );

  // 初回レンダリング時にメモ一覧を取得
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingMemos(true);
        const response = await listMemos();
        const fetchedMemos: Memo[] = response.items.map((item) => ({
          id: item.memoId,
          title: item.title,
          content: "", // 一覧取得時はcontentは含まれない
        }));
        setMemos(fetchedMemos);

        // メモが存在する場合は最初のメモを選択
        if (fetchedMemos.length > 0) {
          setSelectedMemoId(fetchedMemos[0].id);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load memos"));
      } finally {
        setIsLoadingMemos(false);
      }
    })();
  }, []);

  // selectedMemoIdが変更されたときに、選択されたメモのコンテンツを取得
  useEffect(() => {
    (async () => {
      // 選択されたメモがない場合はスキップ
      if (!selectedMemoId) return;

      setMemos((prevMemos) => {
        const memo = prevMemos.find((memo: Memo) => memo.id === selectedMemoId);
        // 既にcontentがある場合はスキップ
        if (memo && memo.content) return prevMemos;

        (async () => {
          try {
            const { getMemo } = await import("../utils/api");
            const memoDetail = await getMemo(selectedMemoId);
            setMemos((currentMemos) =>
              currentMemos.map((memo: Memo) =>
                memo.id === selectedMemoId
                  ? {
                      ...memo,
                      content: memoDetail.content,
                      title: memoDetail.title,
                    }
                  : memo
              )
            );
          } catch (error) {
            setErrorMessage(getErrorMessage(error, "Failed to load memo"));
          }
        })();

        return prevMemos;
      });
    })();
  }, [selectedMemoId]);

  // メモを保存する関数
  const saveMemo = useCallback(
    async (memoId: string, title: string, content: string): Promise<void> => {
      try {
        setSaveStatus("saving");
        const { updateMemo } = await import("../utils/api");
        await updateMemo(memoId, title, content);
        setSaveStatus("saved");

        // 2秒後にsavedをidleに戻す
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        setSaveStatus("idle");
        setErrorMessage(getErrorMessage(error, "Failed to save memo"));
      }
    },
    []
  );

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
    [selectedMemoId, autoSaveTimer, saveMemo]
  );

  const handleSelectMemo = useCallback(
    (memoId: string): void => setSelectedMemoId(memoId),
    []
  );

  const handleToggleDrawer = useCallback(
    (): void => setIsDrawerOpen((prev) => !prev),
    []
  );

  const handleAddMemo = useCallback(async (): Promise<void> => {
    try {
      // メモを作成
      const { createMemo } = await import("../utils/api");
      const newMemo = await createMemo(
        DEFAULT_MEMO_TITLE,
        DEFAULT_MEMO_CONTENT
      );

      // メモの状態を更新
      setMemos((prevMemos: Memo[]) => [
        ...prevMemos,
        {
          id: newMemo.memoId,
          title: DEFAULT_MEMO_TITLE,
          content: DEFAULT_MEMO_CONTENT,
        },
      ]);
      setSelectedMemoId(newMemo.memoId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create memo"));
    }
  }, []);

  const handleDeleteMemo = useCallback(
    async (memoId: string): Promise<void> => {
      try {
        // メモを削除
        const { deleteMemo } = await import("../utils/api");
        await deleteMemo(memoId);

        // メモの状態を更新
        setMemos((prevMemos: Memo[]) => {
          const filteredMemos = prevMemos.filter(
            (memo: Memo) => memo.id !== memoId
          );
          // 削除するメモが選択中の場合、別のメモを選択
          if (memoId === selectedMemoId && filteredMemos.length > 0) {
            setSelectedMemoId(filteredMemos[0].id);
          } else if (memoId === selectedMemoId) {
            setSelectedMemoId(null);
          }
          return filteredMemos;
        });
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to delete memo"));
      }
    },
    [selectedMemoId]
  );

  const handleUpdateTitle = useCallback(
    (newTitle: string): void => {
      setMemos((prevMemos: Memo[]) =>
        prevMemos.map((memo: Memo) =>
          memo.id === selectedMemoId ? { ...memo, title: newTitle } : memo
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
    [selectedMemoId, autoSaveTimer, saveMemo]
  );

  // コンポーネントのアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // エラーメッセージを自動的に消すタイマー
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // エラーメッセージを閉じる処理
  const handleCloseError = useCallback((): void => {
    setErrorMessage(null);
  }, []);

  // レイアウトモードを切り替える関数
  const handleToggleLayout = useCallback((): void => {
    setLayoutMode((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
  }, []);

  // リサイズ処理
  const handleMouseDown = useCallback((): void => {
    setIsDragging(true);
  }, []);

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

  return (
    <div className="flex flex-col h-screen">
      {errorMessage && (
        <ErrorAlert message={errorMessage} onClose={handleCloseError} />
      )}
      <Header
        title={selectedMemo?.title ?? "Markdown Note Portal"}
        onToggleDrawer={handleToggleDrawer}
        isDrawerOpen={isDrawerOpen}
        onUpdateTitle={handleUpdateTitle}
        hasSelectedMemo={selectedMemo !== undefined}
        saveStatus={saveStatus}
        layoutMode={layoutMode}
        onToggleLayout={handleToggleLayout}
      />
      <Drawer
        memos={memos}
        selectedMemoId={selectedMemoId}
        onSelectMemo={handleSelectMemo}
        isOpen={isDrawerOpen}
        onCloseDrawer={handleToggleDrawer}
        onAddMemo={handleAddMemo}
        onDeleteMemo={handleDeleteMemo}
      />
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
                handleMarkdownContentChange={handleMarkdownContentChange}
                layoutMode={layoutMode}
                widthPercent={editorWidthPercent}
              />
              <div
                className={`bg-base-300 hover:bg-primary shrink-0 transition-colors ${
                  layoutMode === "horizontal"
                    ? "w-1 cursor-col-resize"
                    : "h-1 cursor-row-resize"
                }`}
                onMouseDown={handleMouseDown}
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
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddMemo}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Memo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
