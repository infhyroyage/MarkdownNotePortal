import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutMode, Memo, SaveStatus } from "../types/state";
import { getErrorMessage, listMemos } from "../utils/api";
import { DEFAULT_MEMO_CONTENT, DEFAULT_MEMO_TITLE } from "../utils/const";
import Drawer from "./Drawer";
import ErrorAlert from "./ErrorAlert";
import Header from "./Header";
import Workspace from "./Workspace";

/**
 * 認証済みユーザーの全体画面を表示するコンポーネント
 * @returns {JSX.Element} 認証済みユーザーの全体画面を表示するコンポーネント
 */
export default function AuthenticatedDisplay(): JSX.Element {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState<boolean>(true);
  const [isLoadingMemoDetail, setIsLoadingMemoDetail] =
    useState<boolean>(false);
  const [isCreatingMemo, setIsCreatingMemo] = useState<boolean>(false);
  const [isDeletingMemo, setIsDeletingMemo] = useState<boolean>(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFormatting, setIsFormatting] = useState<boolean>(false);

  // 選択されたメモを取得
  const selectedMemo: Memo | undefined = useMemo<Memo | undefined>(
    () => memos.find((memo: Memo) => memo.id === selectedMemoId),
    [memos, selectedMemoId]
  );

  // メモ一覧を取得する関数
  const loadMemos = useCallback(async (search?: string): Promise<void> => {
    try {
      setIsLoadingMemos(true);
      const response = await listMemos(search);
      const fetchedMemos: Memo[] = response.items.map((item) => ({
        id: item.memoId,
        title: item.title,
        content: undefined, // 一覧取得時はコンテンツを取得しない(詳細取得後に設定)
        lastUpdatedAt: item.lastUpdatedAt,
      }));
      setMemos(fetchedMemos);

      // メモが存在する場合は最初のメモを選択
      if (fetchedMemos.length > 0) {
        setSelectedMemoId(fetchedMemos[0].id);
      } else {
        setSelectedMemoId(null);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to load memos"));
    } finally {
      setIsLoadingMemos(false);
    }
  }, []);

  // 初回レンダリング時にメモ一覧を取得
  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // selectedMemoIdが変更されたときに、選択されたメモのコンテンツを取得
  useEffect(() => {
    (async () => {
      // 選択されたメモがない場合はスキップ
      if (!selectedMemoId) return;

      // 既にメモのコンテンツを取得している場合はスキップ
      // content が undefined でなければ取得済み。空文字列も取得済みとして扱う
      const existedMemo: Memo | undefined = memos.find(
        (memo: Memo) => memo.id === selectedMemoId
      );
      if (existedMemo && existedMemo.content !== undefined) return;

      // メモのコンテンツを取得
      try {
        setIsLoadingMemoDetail(true);
        const { getMemo } = await import("../utils/api");
        const memoDetail = await getMemo(selectedMemoId);
        setMemos((currentMemos: Memo[]) =>
          currentMemos.map((memo: Memo) =>
            memo.id === selectedMemoId
              ? {
                  ...memo,
                  title: memoDetail.title,
                  content: memoDetail.content,
                }
              : memo
          )
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load memo"));
      } finally {
        setIsLoadingMemoDetail(false);
      }
    })();
  }, [memos, selectedMemoId]);

  // メモを保存する関数
  const saveMemo = useCallback(
    async (memoId: string, title: string, content: string): Promise<void> => {
      try {
        setSaveStatus("saving");
        const { updateMemo } = await import("../utils/api");
        const response = await updateMemo(memoId, title, content);

        // メモの最終更新日時を更新
        setMemos((currentMemos: Memo[]) =>
          currentMemos.map((memo: Memo) =>
            memo.id === memoId
              ? { ...memo, lastUpdatedAt: response.lastUpdatedAt }
              : memo
          )
        );

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
      setIsCreatingMemo(true);
      // メモを作成
      const { createMemo } = await import("../utils/api");
      const newMemo = await createMemo(
        DEFAULT_MEMO_TITLE,
        DEFAULT_MEMO_CONTENT
      );

      // メモの状態を更新
      setMemos((prevMemos: Memo[]) => [
        {
          id: newMemo.memoId,
          title: DEFAULT_MEMO_TITLE,
          content: DEFAULT_MEMO_CONTENT,
          lastUpdatedAt: newMemo.lastUpdatedAt,
        },
        ...prevMemos,
      ]);
      setSelectedMemoId(newMemo.memoId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create memo"));
    } finally {
      setIsCreatingMemo(false);
    }
  }, []);

  const handleDeleteMemo = useCallback(
    async (memoId: string): Promise<void> => {
      try {
        setIsDeletingMemo(true);
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
      } finally {
        setIsDeletingMemo(false);
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
            if (currentMemo && currentMemo.content !== undefined) {
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

  // 検索を実行する関数
  const handleSearch = useCallback(
    (query: string): void => {
      setSearchQuery(query);
      loadMemos(query);
    },
    [loadMemos]
  );

  // Markdownをフォーマットする関数
  const handleFormatMarkdown = useCallback(async (): Promise<void> => {
    if (!selectedMemoId || !selectedMemo || selectedMemo.content === undefined)
      return;

    try {
      setIsFormatting(true);

      // prettierを動的にインポートしてMarkdownをフォーマット
      const prettier = await import("prettier");
      const parserMarkdown = await import("prettier/plugins/markdown");

      const formattedContent = await prettier.format(selectedMemo.content, {
        parser: "markdown",
        plugins: [parserMarkdown],
        proseWrap: "preserve",
      });

      // フォーマットされたコンテンツで状態を更新
      setMemos((prevMemos: Memo[]) =>
        prevMemos.map((memo: Memo) =>
          memo.id === selectedMemoId
            ? { ...memo, content: formattedContent.trim() }
            : memo
        )
      );

      // 既存のタイマーをキャンセル
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // 3秒後に自動保存
      const timer = setTimeout(() => {
        setMemos((currentMemos: Memo[]) => {
          const currentMemo = currentMemos.find(
            (memo: Memo) => memo.id === selectedMemoId
          );
          if (currentMemo && currentMemo.content !== undefined) {
            saveMemo(selectedMemoId, currentMemo.title, currentMemo.content);
          }
          return currentMemos;
        });
      }, 3000);
      setAutoSaveTimer(timer);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to format markdown"));
    } finally {
      setIsFormatting(false);
    }
  }, [selectedMemoId, selectedMemo, autoSaveTimer, saveMemo]);

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
        hasSelectedMemo={selectedMemoId !== null}
        saveStatus={saveStatus}
        layoutMode={layoutMode}
        onToggleLayout={handleToggleLayout}
        onFormatMarkdown={handleFormatMarkdown}
        isFormatting={isFormatting}
      />
      <Drawer
        memos={memos}
        selectedMemoId={selectedMemoId}
        onSelectMemo={handleSelectMemo}
        isCreatingMemo={isCreatingMemo}
        isDeletingMemo={isDeletingMemo}
        isOpen={isDrawerOpen}
        onCloseDrawer={handleToggleDrawer}
        onAddMemo={handleAddMemo}
        onDeleteMemo={handleDeleteMemo}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />
      <Workspace
        autoSaveTimer={autoSaveTimer}
        setAutoSaveTimer={setAutoSaveTimer}
        isCreatingMemo={isCreatingMemo}
        layoutMode={layoutMode}
        isLoadingMemos={isLoadingMemos}
        isLoadingMemoDetail={isLoadingMemoDetail}
        onClickNewMemoButton={handleAddMemo}
        saveMemo={saveMemo}
        selectedMemo={selectedMemo}
        selectedMemoId={selectedMemoId}
        setMemos={setMemos}
      />
    </div>
  );
}
