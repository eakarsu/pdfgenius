import React from 'react';
import { useConfirmContext } from './ConfirmContext';
import './index.css';

function ConfirmDialog() {
  const { confirmState, handleConfirm, handleCancel } = useConfirmContext();

  if (!confirmState) return null;

  return (
    <div className="confirm-overlay" onClick={handleCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className={`confirm-icon confirm-icon-${confirmState.variant}`}>
          {confirmState.variant === 'danger' ? '⚠' : '?'}
        </div>
        <h3 className="confirm-title">{confirmState.title}</h3>
        <p className="confirm-message">{confirmState.message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={handleCancel}>
            {confirmState.cancelLabel}
          </button>
          <button
            className={`confirm-btn confirm-btn-${confirmState.variant}`}
            onClick={handleConfirm}
          >
            {confirmState.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
