import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);

  const confirm = useCallback(({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' } = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: title || 'Confirm Action',
        message: message || 'Are you sure?',
        confirmLabel,
        cancelLabel,
        variant,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState?.resolve(true);
    setConfirmState(null);
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState?.resolve(false);
    setConfirmState(null);
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ confirmState, confirm, handleConfirm, handleCancel }}>
      {children}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function useConfirmContext() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmContext must be used within a ConfirmProvider');
  }
  return context;
}

export default ConfirmContext;
