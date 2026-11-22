import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import { Spinner } from '../../components/Spinner';

/**
 * Confirmation dialog for admin approve / reject actions, with an optional note.
 * onConfirm(note) must return a Promise that resolves to an error message string or null.
 */
export default function ActionModal({ open, title, description, confirmLabel, danger, withNote, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNote('');
      setError('');
    }
  }, [open]);

  async function confirm() {
    setBusy(true);
    setError('');
    const err = await onConfirm(note);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title}>
      <div className="space-y-4">
        {description}
        {withNote && (
          <div>
            <label className="label" htmlFor="admin-note">
              Note to user (optional)
            </label>
            <textarea
              id="admin-note"
              rows={3}
              className="textarea-field"
              placeholder="e.g. Transaction ID not found"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
          </div>
        )}
        <Notice type="error" message={error} />
        <div className="flex gap-3">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${danger ? 'btn-danger' : 'btn-success'} flex-1`} onClick={confirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
