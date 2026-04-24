import React, { useState } from 'react';
import './index.css';

function FilterControls({ filters = [], onApply, onReset }) {
  const [values, setValues] = useState({});

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onApply(values);
  };

  const handleReset = () => {
    setValues({});
    onReset();
  };

  return (
    <div className="filter-controls">
      <div className="filter-row">
        {filters.map(filter => (
          <div key={filter.name} className="filter-item">
            <label className="filter-label">{filter.label}</label>
            {filter.type === 'select' && (
              <select
                className="filter-select"
                value={values[filter.name] || ''}
                onChange={(e) => handleChange(filter.name, e.target.value)}
              >
                <option value="">All</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {filter.type === 'date' && (
              <input
                type="date"
                className="filter-date"
                value={values[filter.name] || ''}
                onChange={(e) => handleChange(filter.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="filter-actions">
        <button className="filter-btn filter-btn-apply" onClick={handleApply}>
          Apply Filters
        </button>
        <button className="filter-btn filter-btn-reset" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default FilterControls;
