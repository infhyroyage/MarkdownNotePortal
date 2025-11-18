import { useEffect, type JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import useTheme from "../hooks/useTheme";
import type { WorkspacePreviewProps } from "../types/props";

// シンタックスハイライトのテーマCSSをURLとしてインポート
import githubLightTheme from "highlight.js/styles/github.css?url";
import githubDarkTheme from "highlight.js/styles/github-dark.css?url";

/**
 * ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネント
 * @param {WorkspacePreviewProps} props ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネントのProps
 * @returns {JSX.Element} ワークスペースの右側にあるMarkdownプレビューを表示するコンポーネント
 */
export default function WorkspacePreview(
  props: WorkspacePreviewProps
): JSX.Element {
  const { layoutMode, markdownContent, widthPercent } = props;
  const { theme } = useTheme();

  // テーマに応じてシンタックスハイライトのCSSを動的に切り替え
  useEffect(() => {
    const linkId = "highlight-theme";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // テーマに応じて適切なCSSファイルのURLを設定
    link.href = theme === "dark" ? githubDarkTheme : githubLightTheme;
  }, [theme]);

  return (
    <div
      className="flex flex-col"
      style={
        layoutMode === "horizontal"
          ? { width: `${widthPercent}%` }
          : { height: `${widthPercent}%` }
      }
    >
      <div className="flex-1 overflow-auto">
        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {markdownContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
