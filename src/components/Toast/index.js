import React from 'react';
import { useToastContext } from './ToastContext';
import './index.css';

function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-message">{toast.message}</div>
          <button className="toast-dismiss" onClick={() => removeToast(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
