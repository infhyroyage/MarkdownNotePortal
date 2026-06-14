import githubLightTheme from "highlight.js/styles/github.css?url";

/**
 * メモのタイトルからファイル名に使用できない以下の文字を除去して、PDFファイル名(拡張子".pdf"を除く)を生成する
 * * 制御文字
 * * < > : " / \ | ? *
 * @param {string} title メモのタイトル
 * @returns {string} PDFファイル名(除去した結果が空の場合は"memo"とする)
 */
function sanitizePdfFilename(title: string): string {
  const sanitized = title
    .trim()
    .split("")
    .filter((char: string) => {
      const code = char.charCodeAt(0);
      return code > 31 && !/[<>:"/\\|?*]/.test(char);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length > 0 ? sanitized : "memo";
}

/**
 * ライトモード/ダークモードのテーマ設定によらず、PDFは常にライトモードのレイアウトで出力するためのスタイルを適用する
 * @param {Document} clonedDoc キャプチャ用クローンDOM
 * @param {HTMLElement} clonedElement キャプチャ用クローンDOMの要素
 * @returns {void}
 */
function applyLightModeToClone(
  clonedDoc: Document,
  clonedElement: HTMLElement,
): void {
  clonedDoc.documentElement.setAttribute("data-theme", "light");
  clonedDoc.documentElement.style.colorScheme = "light";

  clonedElement.style.backgroundColor = "#ffffff";

  let highlightLink = clonedDoc.getElementById(
    "highlight-theme",
  ) as HTMLLinkElement | null;
  if (!highlightLink) {
    highlightLink = clonedDoc.createElement("link");
    highlightLink.id = "highlight-theme";
    highlightLink.rel = "stylesheet";
    clonedDoc.head.appendChild(highlightLink);
  }
  highlightLink.href = githubLightTheme;
}

/**
 * プレビューDOM要素をキャプチャしてPDFとしてダウンロードする
 * @param {HTMLElement} element WorkspacePreviewコンポーネントのプレビューDOM要素
 * @param {string} title メモのタイトル
 * @returns {Promise<void>}
 */
export async function exportPreviewToPdf(
  element: HTMLElement,
  title: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
      applyLightModeToClone(clonedDoc, clonedElement);
    },
  });

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(`${sanitizePdfFilename(title)}.pdf`);
}
