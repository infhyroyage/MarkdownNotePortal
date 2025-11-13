import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import type { DrawerProps } from "../types/props";
import type { Memo } from "../types/state";
import DeleteMemoModal from "./DeleteMemoModal";
import DrawerMemoButton from "./DrawerMemoButton";
import NewMemoButton from "./NewMemoButton";

/**
 * メモのリストを表示するドロワーコンポーネント
 * @param {DrawerProps} props メモのリストを表示するドロワーコンポーネントのProps
 * @returns {JSX.Element} メモのリストを表示するドロワーコンポーネント
 */
export default function Drawer(props: DrawerProps): JSX.Element {
  const {
    isCreatingMemo,
    isDeletingMemo,
    isOpen,
    memos,
    onAddMemo,
    onCloseDrawer,
    onDeleteMemo,
    onSelectMemo,
    selectedMemoId,
  } = props;

  const [deleteMemoId, setDeleteMemoId] = useState<string | null>(null);

  // 相対時間をリアルタイムで更新するためのstate
  // このstateの更新により、すべての子コンポーネント（DrawerMemoButton）が一斉に再レンダリングされる
  const [, setCurrentTime] = useState(Date.now());

  // 1秒ごとに現在時刻を更新して、すべてのメモの相対時間表示を更新
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // クリーンアップ: コンポーネントがアンマウントされる際にタイマーをクリア
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // ドロワーが開いている時のみEscapeキーでドロワーを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCloseDrawer]);

  const deleteMemoTitle: string | null = useMemo(() => {
    if (!deleteMemoId) return null;
    return memos.find((memo: Memo) => memo.id === deleteMemoId)?.title ?? null;
  }, [deleteMemoId, memos]);

  const handleDeleteClick = useCallback((memoId: string): void => {
    setDeleteMemoId(memoId);
  }, []);

  const handleDeleteModal = useCallback(async (): Promise<void> => {
    if (deleteMemoId) {
      await onDeleteMemo(deleteMemoId);
      setDeleteMemoId(null);
    }
  }, [deleteMemoId, onDeleteMemo]);

  const handleCancelModal = useCallback((): void => {
    setDeleteMemoId(null);
  }, []);

  // メモを最終更新日時の降順でソート
  const sortedMemos: Memo[] = useMemo(() => {
    return [...memos].sort((a: Memo, b: Memo) => {
      return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
    });
  }, [memos]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 z-10 top-16 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseDrawer}
      />
      <div
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-base-100 shadow-lg transition-transform duration-300 z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "250px" }}
      >
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-base-300">
            <NewMemoButton
              className="w-full"
              onClick={onAddMemo}
              isLoading={isCreatingMemo}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="menu w-full p-0">
              {sortedMemos.map((memo: Memo) => (
                <DrawerMemoButton
                  key={memo.id}
                  memoId={memo.id}
                  isSelected={selectedMemoId === memo.id}
                  memoTitle={memo.title}
                  lastUpdatedAt={memo.lastUpdatedAt}
                  onDeleteClick={handleDeleteClick}
                  onSelectMemo={onSelectMemo}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
      {deleteMemoTitle && (
        <DeleteMemoModal
          title={deleteMemoTitle}
          onCancel={handleCancelModal}
          onDelete={handleDeleteModal}
          isDeleting={isDeletingMemo}
        />
      )}
    </>
  );
}
