import { useState } from 'react';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import { Spinner } from '../../components/Spinner';

/**
 * Modal with a form. onSubmit() returns a Promise resolving to an error message, or null on success.
 * Render it conditionally (mount = open) so field state resets each time.
 */
export default function AdminFormModal({ title, onClose, onSubmit, submitLabel = 'Save', danger = false, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handle(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await onSubmit();
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Modal open onClose={() => !busy && onClose()} title={title}>
      <form onSubmit={handle} className="space-y-3" noValidate>
        {children}
        <Notice type="error" message={error} />
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
