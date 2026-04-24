import React, { useState, useEffect, useRef } from 'react';
import './index.css';

function SearchBar({ onSearch, placeholder = 'Search...', debounceMs = 300, value = '' }) {
  const [searchTerm, setSearchTerm] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      onSearch(val);
    }, debounceMs);
  };

  const handleClear = () => {
    setSearchTerm('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon">&#128269;</span>
      <input
        type="text"
        className="search-bar-input"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
      />
      {searchTerm && (
        <button className="search-bar-clear" onClick={handleClear}>
          &times;
        </button>
      )}
    </div>
  );
}

export default SearchBar;
