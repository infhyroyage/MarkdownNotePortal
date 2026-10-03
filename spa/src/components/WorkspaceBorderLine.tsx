import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { WorkspaceBorderLineProps } from "../types/props";

/**
 * ワークスペースの境界線を表示するコンポーネント
 * @returns {JSX.Element} ワークスペースの境界線を表示するコンポーネント
 */
export default function WorkspaceBorderLine(
  props: WorkspaceBorderLineProps,
): JSX.Element {
  const { layoutMode, setEditorWidthPercent } = props;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragSessionRef = useRef<{
    pointerId: number;
    el: HTMLDivElement;
    onMove: (ev: PointerEvent) => void;
    onEnd: (ev: PointerEvent) => void;
  } | null>(null);

  // 境界線のドラッグセッションをクリーンアップする処理
  const cleanupSeparatorDrag = useCallback((pointerId?: number): void => {
    const session = dragSessionRef.current;
    if (!session) return;
    if (pointerId !== undefined && session.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", session.onMove);
    window.removeEventListener("pointerup", session.onEnd);
    window.removeEventListener("pointercancel", session.onEnd);
    if (session.el.hasPointerCapture(session.pointerId)) {
      session.el.releasePointerCapture(session.pointerId);
    }
    dragSessionRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupSeparatorDrag();
    };
  }, [cleanupSeparatorDrag]);

  // 境界線のドラッグ時のハンドラで呼び出すためのリサイズ処理
  const applyResizeFromClient = useCallback(
    (clientX: number, clientY: number): void => {
      if (layoutMode === "horizontal") {
        // 水平レイアウトの場合、WorkspaceEditorの横幅を10%~90%の範囲でリサイズ
        const newWidth = (clientX / window.innerWidth) * 100;
        if (newWidth >= 10 && newWidth <= 90) {
          setEditorWidthPercent(newWidth);
        }
      } else {
        // 垂直レイアウトの場合、WorkspaceEditorの縦幅を10%~90%の範囲でリサイズ
        const header = document.querySelector("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const availableHeight = window.innerHeight - headerHeight;
        const newHeight = ((clientY - headerHeight) / availableHeight) * 100;
        if (newHeight >= 10 && newHeight <= 90) {
          setEditorWidthPercent(newHeight);
        }
      }
    },
    [layoutMode, setEditorWidthPercent],
  );

  // 境界線のドラッグ時のハンドラ
  const handlePointerDownBorderLine = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      // 既にドラッグセッションが存在する場合は何もしない
      if (dragSessionRef.current !== null) return;
      // マウスの左クリック以外は何もしない
      if (e.pointerType === "mouse" && e.button !== 0) return;

      // デフォルトの動作を防止
      e.preventDefault();

      // ドラッグセッションを作成
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      el.setPointerCapture(pointerId);

      // リサイズ処理を適用
      applyResizeFromClient(e.clientX, e.clientY);

      // ドラッグ中のハンドラを作成
      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) return;
        applyResizeFromClient(ev.clientX, ev.clientY);
      };
      const onEnd = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId) return;
        cleanupSeparatorDrag(pointerId);
      };
      dragSessionRef.current = { pointerId, el, onMove, onEnd };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      setIsDragging(true);
    },
    [applyResizeFromClient, cleanupSeparatorDrag],
  );

  // 境界線のダブルクリック時のリセット処理
  const handleDoubleClickBorderLine = useCallback((): void => {
    setEditorWidthPercent(50);
  }, [setEditorWidthPercent]);

  return (
    <div
      className={`shrink-0 touch-none select-none transition-colors ${
        isDragging ? "bg-primary" : "bg-base-content/20 hover:bg-primary"
      } ${
        layoutMode === "horizontal"
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize"
      }`}
      onPointerDown={handlePointerDownBorderLine}
      onLostPointerCapture={(ev: ReactPointerEvent<HTMLDivElement>) => {
        cleanupSeparatorDrag(ev.pointerId);
      }}
      onDoubleClick={handleDoubleClickBorderLine}
      role="separator"
    />
  );
}
