/**
 * 初期メモのコンテンツ
 */
export const INITIAL_MEMO_CONTENT: string = `# Welcome to Markdown Editor

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
 * 初期メモのタイトル
 */
export const INITIAL_MEMO_TITLE: string = "Initial Memo";

/**
 * ローカルストレージのキー: エディター幅
 */
export const LOCAL_STORAGE_EDITOR_WIDTH_KEY: string = "editor_width";

/**
 * エディター幅のデフォルト値（パーセンテージ）
 */
export const DEFAULT_EDITOR_WIDTH: number = 50;
