import type { JSX } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

const INITIAL_MARKDOWN_CONTENT: string = `# Welcome to Markdown Editor

## Features

- **Real-time preview**: See your markdown rendered as you type
- **Split view**: Edit and preview side by side
- **Markdown support**: Full markdown syntax support

## Example

### Code Block

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Lists

1. First item
2. Second item
3. Third item

- Bullet point 1
- Bullet point 2
- Bullet point 3

### Links and Images

[Link to GitHub](https://github.com)

### Blockquote

> This is a blockquote.
> It can span multiple lines.

### Table

| Feature | Status |
|---------|--------|
| Editor  | ✅     |
| Preview | ✅     |
| Save    | 🔄     |

---

Start editing to see your changes!
`;

/**
 * Markdown入力エリア(左側)とプレビューエリア(右側)を表示するコンポーネント
 * @returns {JSX.Element} Markdown入力エリア(左側)とプレビューエリア(右側)を表示するコンポーネント
 */
export default function MarkdownEditor(): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState<string>(
    INITIAL_MARKDOWN_CONTENT
  );

  return (
    <div className="flex h-full">
      <div className="w-1/2 flex flex-col border-r border-base-300">
        <textarea
          className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-base-100"
          value={markdownContent}
          onChange={(e) => setMarkdownContent(e.target.value)}
          placeholder="Enter your markdown here..."
        />
      </div>
      <div className="w-1/2 flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none p-4">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
