import type { ChangeEvent } from "react";

/**
 * ワークスペースの左側にあるMarkdownエディターを表示するコンポーネントのProps
 */
export interface WorkspaceEditorProps {
  /**
   * Markdownコンテンツ
   */
  markdownContent: string;

  /**
   * Markdownコンテンツを変更する関数
   */
  handleMarkdownContentChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
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
