import githubLightTheme from "highlight.js/styles/github.css?url";

/**
 * 背景色とみなすRGBのしきい値(これ以上明るいピクセルは背景とみなす)
 */
const BLANK_PIXEL_THRESHOLD: number = 250;

/**
 * テキスト行の途中で分割しないために、理想の分割位置から上方向へ探索する最大割合
 */
const SAFE_CUT_SEARCH_RATIO: number = 0.15;

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
 * canvasの指定行がすべて背景色(白に近い)かどうかを判定する
 * @param {Uint8ClampedArray} data getImageDataで取得したピクセル配列
 * @param {number} rowIndex 判定する行のインデックス(探索領域内の相対位置)
 * @param {number} width canvasの幅(ピクセル)
 * @returns {boolean} 行がすべて背景色の場合はtrue、それ以外はfalse
 */
function isRowBlank(
  data: Uint8ClampedArray,
  rowIndex: number,
  width: number,
): boolean {
  const base = rowIndex * width * 4;
  for (let x = 0; x < width; x++) {
    const i = base + x * 4;
    if (
      data[i] < BLANK_PIXEL_THRESHOLD ||
      data[i + 1] < BLANK_PIXEL_THRESHOLD ||
      data[i + 2] < BLANK_PIXEL_THRESHOLD
    ) {
      return false;
    }
  }
  return true;
}

/**
 * テキスト行の途中で分割されないように、理想の分割位置から上方向へ空白行を探索して、安全な分割高さを返す
 * 空白行が見つからない場合は理想の高さをそのまま返す
 * @param {CanvasRenderingContext2D} srcCtx ソースcanvasの2Dコンテキスト
 * @param {number} width canvasの幅(ピクセル)
 * @param {number} sourceY 現在ページの開始Y座標(ピクセル)
 * @param {number} idealHeight 理想の分割高さ(ピクセル)
 * @param {number} canvasHeight canvas全体の高さ(ピクセル)
 * @returns {number} 安全な分割高さ(ピクセル)
 */
function findSafeCutHeight(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  sourceY: number,
  idealHeight: number,
  canvasHeight: number,
): number {
  const idealCutY = Math.floor(sourceY + idealHeight);

  // 最終ページ(分割不要)の場合はそのまま返す
  if (idealCutY >= canvasHeight) {
    return idealHeight;
  }

  const maxSearch = Math.floor(idealHeight * SAFE_CUT_SEARCH_RATIO);
  const searchTop = Math.max(Math.floor(sourceY) + 1, idealCutY - maxSearch);
  const regionHeight = idealCutY - searchTop;
  if (regionHeight <= 0) {
    return idealHeight;
  }

  try {
    const { data } = srcCtx.getImageData(0, searchTop, width, regionHeight);
    // 理想位置に近い側(下)から空白行を探索する
    for (let y = regionHeight - 1; y >= 0; y--) {
      if (isRowBlank(data, y, width)) {
        return searchTop + y - sourceY;
      }
    }
  } catch {
    // getImageDataがクロスオリジン等で失敗した場合は理想の高さにフォールバック
    return idealHeight;
  }

  return idealHeight;
}

/**
 * canvas画像をページごとに分割してPDFに追加する
 * @param {InstanceType<typeof import("jspdf").jsPDF>} pdf jspdfのインスタンス
 * @param {HTMLCanvasElement} canvas canvas画像
 * @param {number} margin マージン
 * @returns {void}
 */
function addCanvasPagesToPdf(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
  margin: number,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  // 1ページのコンテンツ領域に収まるソースcanvasの高さ(ピクセル)
  const idealSourcePageHeight = (contentHeight * canvas.width) / imgWidth;
  const srcCtx = canvas.getContext("2d");

  let sourceY = 0;
  let isFirstPage = true;

  while (sourceY < canvas.height) {
    let sourceHeight = Math.min(idealSourcePageHeight, canvas.height - sourceY);

    // 最終ページ以外は、テキスト行の途中で切れないように空白行で分割する
    if (srcCtx && sourceY + sourceHeight < canvas.height) {
      sourceHeight = findSafeCutHeight(
        srcCtx,
        canvas.width,
        sourceY,
        sourceHeight,
        canvas.height,
      );
    }

    const destHeight = (sourceHeight * imgWidth) / canvas.width;

    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.ceil(sourceHeight);
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas context for PDF export");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sourceHeight,
      0,
      0,
      canvas.width,
      sourceHeight,
    );

    const pageImgData = pageCanvas.toDataURL("image/png");
    pdf.addImage(pageImgData, "PNG", margin, margin, imgWidth, destHeight);

    sourceY += sourceHeight;
  }
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
  addCanvasPagesToPdf(pdf, canvas, 40);
  pdf.save(`${sanitizePdfFilename(title)}.pdf`);
}
