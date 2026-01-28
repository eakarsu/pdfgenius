import React, { useState, useMemo } from 'react';
import './index.css';

function DataTable({
  data = [],
  columns = [],
  onRowClick,
  onAction,
  loading = false,
  emptyMessage = 'No data available',
  selectable = false,
  onSelectionChange,
  pagination = null,
  onPageChange,
  sortable = true,
  searchable = true,
  searchPlaceholder = 'Search...',
  actions = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(row =>
      columns.some(col => {
        const value = row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle row selection
  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(sortedData.map(row => row.id));
      setSelectedRows(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  // Render cell content
  const renderCell = (row, column) => {
    const value = row[column.key];

    if (column.render) {
      return column.render(value, row);
    }

    if (column.type === 'status') {
      return (
        <span className={`status-badge status-${value?.toLowerCase()}`}>
          {value}
        </span>
      );
    }

    if (column.type === 'date') {
      return value ? new Date(value).toLocaleDateString() : '-';
    }

    if (column.type === 'datetime') {
      return value ? new Date(value).toLocaleString() : '-';
    }

    if (column.type === 'number') {
      return value?.toLocaleString() ?? '-';
    }

    if (column.type === 'size') {
      return formatFileSize(value);
    }

    return value ?? '-';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {/* Search and Actions Bar */}
      {(searchable || actions.length > 0) && (
        <div className="data-table-toolbar">
          {searchable && (
            <div className="search-box">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  &times;
                </button>
              )}
            </div>
          )}

          <div className="table-actions">
            {actions.map((action, i) => (
              <button
                key={i}
                className={`action-btn ${action.variant || 'default'}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <span className="action-icon">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && (
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${sortable && col.sortable !== false ? 'sortable' : ''} ${sortConfig.key === col.key ? 'sorted' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span>{col.label}</span>
                  {sortable && col.sortable !== false && (
                    <span className="sort-icon">
                      {sortConfig.key === col.key
                        ? sortConfig.direction === 'asc' ? '↑' : '↓'
                        : '↕'}
                    </span>
                  )}
                </th>
              ))}
              {onAction && <th className="action-cell">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + (selectable ? 1 : 0) + (onAction ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map(row => (
                <tr
                  key={row.id}
                  className={`${onRowClick ? 'clickable' : ''} ${selectedRows.has(row.id) ? 'selected' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="checkbox-cell" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={col.className}>
                      {renderCell(row, col)}
                    </td>
                  ))}
                  {onAction && (
                    <td className="action-cell" onClick={e => e.stopPropagation()}>
                      <button
                        className="row-action-btn"
                        onClick={() => onAction(row)}
                      >
                        ⋮
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="data-table-pagination">
          <span className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="pagination-controls">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Previous
            </button>
            <span className="page-number">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
