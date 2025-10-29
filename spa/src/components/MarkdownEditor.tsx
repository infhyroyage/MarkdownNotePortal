import { useState } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Markdownエディタ/プレビューアコンポーネント
 * 左側にMarkdown入力エリア、右側にプレビューエリアを表示
 */
export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState<string>(`# Welcome to Markdown Editor

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
`);

  return (
    <div className="flex h-full">
      {/* 左側：Markdown入力エリア */}
      <div className="w-1/2 flex flex-col border-r border-base-300">
        <div className="bg-base-200 px-4 py-2 border-b border-base-300">
          <h2 className="text-lg font-semibold">Markdown</h2>
        </div>
        <textarea
          className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-base-100"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Enter your markdown here..."
        />
      </div>

      {/* 右側：プレビューエリア */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-base-200 px-4 py-2 border-b border-base-300">
          <h2 className="text-lg font-semibold">Preview</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none p-4">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
