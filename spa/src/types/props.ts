import type { ChangeEvent } from "react";
import type { Memo, SaveStatus } from "./state";

/**
 * メモを削除するモーダルのProps
 */
export interface DeleteMemoModalProps {
  /**
   * 削除するメモのタイトル
   */
  title: string;

  /**
   * メモの削除をキャンセルする関数
   */
  onCancel: () => void;

  /**
   * メモを削除を実行する関数
   */
  onDelete: () => void;
}

/**
 * メモドロワーコンポーネントのProps
 */
export interface DrawerProps {
  /**
   * ドロワーが開いているかどうか
   */
  isOpen: boolean;

  /**
   * メモのリスト
   */
  memos: Memo[];

  /**
   * メモを追加する関数
   */
  onAddMemo: () => void;

  /**
   * ドロワーを閉じる関数
   */
  onCloseDrawer: () => void;

  /**
   * メモを削除する関数
   */
  onDeleteMemo: (memoId: string) => void;

  /**
   * メモを選択する関数
   */
  onSelectMemo: (memoId: string) => void;

  /**
   * 選択中のメモのID
   */
  selectedMemoId: string | null;
}

/**
 * エラーメッセージを表示するアラートのProps
 */
export interface ErrorAlertProps {
  /**
   * エラーメッセージ
   */
  message: string;

  /**
   * アラートを閉じる関数
   */
  onClose: () => void;
}

/**
 * ハンバーガーメニューボタンを表示するコンポーネントのProps
 */
export interface HamburgerMenuButtonProps {
  /**
   * ドロワーが開いているかどうか
   */
  isDrawerOpen: boolean;

  /**
   * ドロワーの表示/非表示を切り替える関数
   */
  onToggleDrawer: () => void;
}

/**
 * ヘッダーコンポーネントのProps
 */
export interface HeaderProps {
  /**
   * 選択中のメモが存在するかどうか
   */
  hasSelectedMemo: boolean;

  /**
   * ドロワーが開いているかどうか
   */
  isDrawerOpen: boolean;

  /**
   * ドロワーの表示/非表示を切り替える関数
   */
  onToggleDrawer: () => void;

  /**
   * タイトルを更新する関数
   */
  onUpdateTitle: (newTitle: string) => void;

  /**
   * 自動保存の状態
   */
  saveStatus: SaveStatus;

  /**
   * ヘッダーのタイトル
   */
  title: string;
}

/**
 * 保存状態のアイコンを表示するコンポーネントのProps
 */
export interface SaveStatusIconProps {
  /**
   * 自動保存の状態
   */
  saveStatus: SaveStatus;
}

/**
 * タイトルエディターコンポーネントのProps
 */
export interface TitleEditorProps {
  /**
   * 選択中のメモが存在するかどうか
   */
  hasSelectedMemo: boolean;

  /**
   * タイトルを更新する関数
   */
  onUpdateTitle: (newTitle: string) => void;

  /**
   * ヘッダーのタイトル
   */
  title: string;
}

/**
 * ワークスペースの左側にあるMarkdownエディターを表示するコンポーネントのProps
 */
export interface WorkspaceEditorProps {
  /**
   * Markdownコンテンツを変更する関数
   */
  handleMarkdownContentChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;

  /**
   * Markdownコンテンツ
   */
  markdownContent: string;
}

/**
 * ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネントのProps
 */
export interface WorkspacePreviewProps {
  /**
   * Markdownコンテンツ
   */
  markdownContent: string;
}
