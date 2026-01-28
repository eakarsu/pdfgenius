import React, { useEffect } from 'react';
import './index.css';

function DetailModal({
  isOpen,
  onClose,
  title,
  data,
  fields = [],
  actions = [],
  size = 'medium',
  children
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Format value based on type
  const formatValue = (value, field) => {
    if (value == null) return '-';

    if (field.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (field.type === 'datetime') {
      return new Date(value).toLocaleString();
    }

    if (field.type === 'status') {
      return (
        <span className={`detail-status status-${value.toLowerCase()}`}>
          {value}
        </span>
      );
    }

    if (field.type === 'json') {
      return (
        <pre className="json-value">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    if (field.type === 'list' && Array.isArray(value)) {
      return (
        <ul className="detail-list">
          {value.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
          ))}
        </ul>
      );
    }

    if (field.type === 'size') {
      return formatFileSize(value);
    }

    if (field.type === 'link') {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="detail-link">
          {value}
        </a>
      );
    }

    if (field.render) {
      return field.render(value, data);
    }

    return String(value);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-container modal-${size}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {children ? (
            children
          ) : (
            <div className="detail-grid">
              {fields.map(field => (
                <div
                  key={field.key}
                  className={`detail-field ${field.fullWidth ? 'full-width' : ''}`}
                >
                  <label className="detail-label">{field.label}</label>
                  <div className="detail-value">
                    {formatValue(data?.[field.key], field)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        {actions.length > 0 && (
          <div className="modal-footer">
            {actions.map((action, i) => (
              <button
                key={i}
                className={`modal-btn ${action.variant || 'default'}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailModal;
