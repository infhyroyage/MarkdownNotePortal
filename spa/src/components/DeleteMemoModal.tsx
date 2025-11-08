import type { JSX } from "react";
import type { DeleteMemoModalProps } from "../types/props";

/**
 * メモを削除するモーダルコンポーネント
 * @param {DeleteMemoModalProps} props メモを削除するモーダルコンポーネントのProps
 * @returns {JSX.Element} メモを削除するモーダルコンポーネント
 */
export default function DeleteMemoModal(
  props: DeleteMemoModalProps
): JSX.Element {
  const { title, onCancel, onDelete } = props;

  return (
    <dialog className="modal modal-open" aria-labelledby="delete-modal-title">
      <div className="modal-box">
        <p className="py-4">Delete memo: {title}?</p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-error" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onCancel}>
          close
        </button>
      </form>
    </dialog>
  );
}
