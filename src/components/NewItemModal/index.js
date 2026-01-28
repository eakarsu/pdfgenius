import React, { useState, useEffect } from 'react';
import './index.css';

function NewItemModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Create New Item',
  fields = [],
  submitLabel = 'Create',
  loading = false
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData = {};
      fields.forEach(field => {
        initialData[field.name] = field.defaultValue ?? '';
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, fields]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, loading]);

  // Handle input change
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    fields.forEach(field => {
      const value = formData[field.name];

      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if (field.validate) {
        const error = field.validate(value, formData);
        if (error) newErrors[field.name] = error;
      }

      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = 'Invalid email address';
        }
      }

      if (field.minLength && value && value.length < field.minLength) {
        newErrors[field.name] = `Minimum ${field.minLength} characters`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  // Render field input
  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleChange(field.name, field.type === 'file' ? e.target.files[0] : e.target.value),
      disabled: loading,
      placeholder: field.placeholder,
      className: errors[field.name] ? 'error' : ''
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps} rows={field.rows || 4} />;

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'file':
        return (
          <div className="file-input-wrapper">
            <input
              type="file"
              id={field.name}
              name={field.name}
              onChange={(e) => handleChange(field.name, e.target.files[0])}
              accept={field.accept}
              disabled={loading}
            />
            <label htmlFor={field.name} className="file-input-label">
              {formData[field.name]?.name || 'Choose file...'}
            </label>
          </div>
        );

      case 'checkbox':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={formData[field.name] || false}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              disabled={loading}
            />
            <span>{field.checkboxLabel || field.label}</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      default:
        return <input type={field.type || 'text'} {...commonProps} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="new-item-overlay" onClick={loading ? undefined : onClose}>
      <div className="new-item-modal" onClick={e => e.stopPropagation()}>
        <div className="new-item-header">
          <h2>{title}</h2>
          <button
            className="close-btn"
            onClick={onClose}
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="new-item-content">
            {errors.submit && (
              <div className="form-error-banner">
                {errors.submit}
              </div>
            )}

            {fields.map(field => (
              <div key={field.name} className={`form-field ${field.type === 'checkbox' ? 'checkbox-field' : ''}`}>
                {field.type !== 'checkbox' && (
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>
                )}
                {renderField(field)}
                {errors[field.name] && (
                  <span className="field-error">{errors[field.name]}</span>
                )}
                {field.hint && !errors[field.name] && (
                  <span className="field-hint">{field.hint}</span>
                )}
              </div>
            ))}
          </div>

          <div className="new-item-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Processing...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewItemModal;
