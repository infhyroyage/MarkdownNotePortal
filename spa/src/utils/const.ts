
/**
 * アクセストークンを保存するCookie名
 * Lambda@Edgeで設定されるCookieと同じ名前
 */
export const COOKIE_NAME_ACCESS_TOKEN: string = "mkmemoportal_access_token";

/**
 * PKCE の code_verifier を保存する Cookie 名
 * Lambda@Edge で設定される Cookie と同じ名前
 */
export const COOKIE_NAME_CODE_VERIFIER: string = "mkmemoportal_code_verifier";

/**
 * メモのコンテンツの初期値
 */
export const DEFAULT_MEMO_CONTENT: string = `# Welcome to Markdown Editor

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
 * メモのタイトルの初期値
 */
export const DEFAULT_MEMO_TITLE: string = "Initial Memo";
