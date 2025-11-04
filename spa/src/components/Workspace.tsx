import type { ChangeEvent, JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Memo } from "../types/state";
import { listMemos } from "../utils/api";
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
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  // 初回レンダリング時にメモ一覧を取得
  useEffect(() => {
    const fetchMemos = async () => {
      try {
        setIsLoading(true);
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
        console.error("Failed to fetch memos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemos();
  }, []);

  // selectedMemoIdが変更されたときに、選択されたメモのコンテンツを取得
  useEffect(() => {
    const fetchMemoContent = async () => {
      if (!selectedMemoId) return;

      // 最新のmemosの値を使用するため、setMemosのコールバック内でチェック
      setMemos((prevMemos) => {
        const memo = prevMemos.find((m) => m.id === selectedMemoId);
        // 既にcontentがある場合はスキップ
        if (memo && memo.content) return prevMemos;

        // contentがない場合は非同期でfetch
        (async () => {
          try {
            const { getMemo } = await import("../utils/api");
            const memoDetail = await getMemo(selectedMemoId);
            setMemos((currentMemos) =>
              currentMemos.map((m) =>
                m.id === selectedMemoId
                  ? { ...m, content: memoDetail.content, title: memoDetail.title }
                  : m
              )
            );
          } catch (error) {
            console.error("Failed to fetch memo content:", error);
          }
        })();

        return prevMemos;
      });
    };

    fetchMemoContent();
  }, [selectedMemoId]);

  const selectedMemo: Memo | undefined = useMemo<Memo | undefined>(
    () => memos.find((memo: Memo) => memo.id === selectedMemoId),
    [memos, selectedMemoId]
  );
  const markdownContent: string | undefined = useMemo<string | undefined>(
    () => selectedMemo?.content,
    [selectedMemo]
  );

  // 自動保存用のタイマーを保持
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // メモを保存する関数
  const saveMemo = useCallback(
    async (memoId: string, title: string, content: string): Promise<void> => {
      try {
        const { updateMemo } = await import("../utils/api");
        await updateMemo(memoId, title, content);
        console.log("Memo saved successfully");
      } catch (error) {
        console.error("Failed to save memo:", error);
      }
    },
    []
  );

  const handleMarkdownContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      const newContent = e.target.value;
      setMemos((prevMemos) =>
        prevMemos.map((memo) =>
          memo.id === selectedMemoId ? { ...memo, content: newContent } : memo
        )
      );

      // 既存のタイマーをキャンセル
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // 5秒後に自動保存
      if (selectedMemoId) {
        const timer = setTimeout(() => {
          setMemos((currentMemos) => {
            const currentMemo = currentMemos.find((m) => m.id === selectedMemoId);
            if (currentMemo) {
              saveMemo(selectedMemoId, currentMemo.title, currentMemo.content);
            }
            return currentMemos;
          });
        }, 5000);
        setAutoSaveTimer(timer);
      }
    },
    [selectedMemoId, autoSaveTimer, saveMemo]
  );

  const handleSelectMemo = useCallback((memoId: string): void => {
    setSelectedMemoId(memoId);
  }, []);

  const handleToggleDrawer = useCallback((): void => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const handleAddMemo = useCallback(async (): Promise<void> => {
    try {
      // メモを作成
      const { createMemo } = await import("../utils/api");
      const newMemo = await createMemo(INITIAL_MEMO_TITLE, INITIAL_MARKDOWN_CONTENT);

      // メモの状態を更新
      const memo: Memo = {
        id: newMemo.memoId,
        title: newMemo.title,
        content: INITIAL_MARKDOWN_CONTENT,
      };
      setMemos((prevMemos) => [...prevMemos, memo]);
      setSelectedMemoId(newMemo.memoId);
    } catch (error) {
      console.error("Failed to create memo:", error);
    }
  }, []);

  const handleDeleteMemo = useCallback(
    async (memoId: string): Promise<void> => {
      try {
        // メモを削除
        const { deleteMemo } = await import("../utils/api");
        await deleteMemo(memoId);

        // メモの状態を更新
        setMemos((prevMemos) => {
          const filteredMemos = prevMemos.filter((memo) => memo.id !== memoId);
          // 削除するメモが選択中の場合、別のメモを選択
          if (memoId === selectedMemoId && filteredMemos.length > 0) {
            setSelectedMemoId(filteredMemos[0].id);
          } else if (memoId === selectedMemoId) {
            setSelectedMemoId(null);
          }
          return filteredMemos;
        });
      } catch (error) {
        console.error("Failed to delete memo:", error);
      }
    },
    [selectedMemoId]
  );

  const handleUpdateTitle = useCallback(
    (newTitle: string): void => {
      setMemos((prevMemos) =>
        prevMemos.map((memo) =>
          memo.id === selectedMemoId ? { ...memo, title: newTitle } : memo
        )
      );

      // 既存のタイマーをキャンセル
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // 5秒後に自動保存
      if (selectedMemoId) {
        const timer = setTimeout(() => {
          setMemos((currentMemos) => {
            const currentMemo = currentMemos.find((m) => m.id === selectedMemoId);
            if (currentMemo) {
              saveMemo(selectedMemoId, currentMemo.title, currentMemo.content);
            }
            return currentMemos;
          });
        }, 5000);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        title={selectedMemo?.title ?? "Markdown Note Portal"}
        onToggleDrawer={handleToggleDrawer}
        isDrawerOpen={isDrawerOpen}
        onUpdateTitle={handleUpdateTitle}
        hasSelectedMemo={selectedMemo !== undefined}
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
          {markdownContent !== undefined ? (
            <>
              <WorkspaceEditor
                markdownContent={markdownContent}
                handleMarkdownContentChange={handleMarkdownContentChange}
              />
              <WorkspacePreview markdownContent={markdownContent} />
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <p className="text-lg text-base-content/70">
                No memo selected. Create a new memo to get started.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
