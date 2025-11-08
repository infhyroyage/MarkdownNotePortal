import type { ChangeEvent, JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Memo, SaveStatus } from "../types/state";
import { getErrorMessage, listMemos } from "../utils/api";
import { INITIAL_MEMO_CONTENT, INITIAL_MEMO_TITLE } from "../utils/const";
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
  const [editorWidth, setEditorWidth] = useState<number>(50); // エディター幅のパーセンテージ
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
        INITIAL_MEMO_TITLE,
        INITIAL_MEMO_CONTENT
      );

      // メモの状態を更新
      setMemos((prevMemos: Memo[]) => [
        ...prevMemos,
        {
          id: newMemo.memoId,
          title: INITIAL_MEMO_TITLE,
          content: INITIAL_MEMO_CONTENT,
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
  const handleCloseError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // リサイズ処理
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const containerWidth = window.innerWidth;
      const newWidth = (e.clientX / containerWidth) * 100;

      // 最小20%、最大80%に制限
      if (newWidth >= 20 && newWidth <= 80) {
        setEditorWidth(newWidth);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // マウスイベントのリスナー登録
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
        <div className="flex h-full">
          {isLoadingMemos ? (
            <div className="flex items-center justify-center w-full h-full">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : selectedMemo !== undefined ? (
            <>
              <WorkspaceEditor
                markdownContent={selectedMemo.content}
                handleMarkdownContentChange={handleMarkdownContentChange}
                width={editorWidth}
              />
              <div
                className="w-1 bg-base-300 hover:bg-primary cursor-col-resize flex-shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and preview"
              />
              <WorkspacePreview
                markdownContent={selectedMemo.content}
                width={100 - editorWidth}
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
