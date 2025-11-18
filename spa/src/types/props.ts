import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { LayoutMode, Memo, SaveStatus } from "./state";

/**
 * メモを削除するモーダルのProps
 */
export interface DeleteMemoModalProps {
  /**
   * メモ削除中である場合はtrue、それ以外はfalse
   */
  isDeleting?: boolean;

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
   * メモ作成中である場合はtrue、それ以外はfalse
   */
  isCreatingMemo: boolean;

  /**
   * メモ削除中である場合はtrue、それ以外はfalse
   */
  isDeletingMemo: boolean;

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
  onDeleteMemo: (memoId: string) => Promise<void>;

  /**
   * 検索関数
   */
  onSearch: (searchQuery: string) => void;

  /**
   * メモを選択する関数
   */
  onSelectMemo: (memoId: string) => void;

  /**
   * 検索文字列
   */
  searchQuery: string;

  /**
   * 選択中のメモのID
   * メモが選択されていない場合はnull
   */
  selectedMemoId: string | null;
}

/**
 * ドロワーのメモボタンのProps
 */
export interface DrawerMemoButtonProps {
  /**
   * メモが選択されているかどうか
   */
  isSelected: boolean;

  /**
   * メモのID
   */
  memoId: string;

  /**
   * メモのタイトル
   */
  memoTitle: string;

  /**
   * 最終更新日時
   */
  lastUpdatedAt: string;

  /**
   * メモを削除するモーダルを表示する関数
   */
  onDeleteClick: (memoId: string) => void;

  /**
   * メモを選択する関数
   */
  onSelectMemo: (memoId: string) => void;
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
   * 現在のレイアウトモード
   */
  layoutMode: LayoutMode;

  /**
   * レイアウトを切り替える関数
   */
  onToggleLayout: () => void;

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
 * レイアウト切り替えボタンコンポーネントのProps
 */
export interface LayoutToggleButtonProps {
  /**
   * 現在のレイアウトモード
   */
  layoutMode: LayoutMode;

  /**
   * レイアウトを切り替える関数
   */
  onToggleLayout: () => void;
}

/**
 * New Memoボタンを表示するコンポーネントのProps
 */
export interface NewMemoButtonProps {
  /**
   * ボタンに追加するTailwindCSSのクラス(省略可能)
   */
  className?: string;

  /**
   * メモ作成中である場合はtrue、それ以外はfalse
   */
  isLoading?: boolean;

  /**
   * New Memoボタンをクリックした時の処理
   */
  onClick: () => void;
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
 * ワークスペースコンポーネントのProps
 */
export interface WorkspaceProps {
  /**
   * 自動保存のタイマー
   */
  autoSaveTimer: NodeJS.Timeout | null;

  /**
   * メモ作成中である場合はtrue、それ以外はfalse
   */
  isCreatingMemo: boolean;

  /**
   * レイアウトモード
   */
  layoutMode: LayoutMode;

  /**
   * メモ一覧を取得中である場合はtrue、それ以外はfalse
   */
  isLoadingMemos: boolean;

  /**
   * メモの詳細を取得中である場合はtrue、それ以外はfalse
   */
  isLoadingMemoDetail: boolean;

  /**
   * New Memoボタンをクリックした時の処理
   */
  onClickNewMemoButton: () => void;

  /**
   * メモを保存する関数
   */
  saveMemo: (memoId: string, title: string, content: string) => Promise<void>;

  /**
   * 選択中のメモ
   * メモが選択されていない場合はundefined
   */
  selectedMemo: Memo | undefined;

  /**
   * 選択中のメモのID
   * メモが選択されていない場合はnull
   */
  selectedMemoId: string | null;

  /**
   * 自動保存のタイマーを設定する関数
   */
  setAutoSaveTimer: (timer: NodeJS.Timeout) => void;

  /**
   * メモ一覧を更新する関数
   */
  setMemos: Dispatch<SetStateAction<Memo[]>>;
}

/**
 * ワークスペースの左側にあるMarkdownエディターを表示するコンポーネントのProps
 */
export interface WorkspaceEditorProps {
  /**
   * レイアウトモード
   */
  layoutMode: LayoutMode;

  /**
   * Markdownコンテンツ
   */
  markdownContent: string;

  /**
   * Markdownコンテンツを変更する関数
   */
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;

  /**
   * エディターのサイズ(画面のパーセンテージ)
   */
  widthPercent: number;
}

/**
 * ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネントのProps
 */
export interface WorkspacePreviewProps {
  /**
   * レイアウトモード
   */
  layoutMode: LayoutMode;

  /**
   * Markdownコンテンツ
   */
  markdownContent: string;

  /**
   * プレビューのサイズ(画面のパーセンテージ)
   */
  widthPercent: number;
}
