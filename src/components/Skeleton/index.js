import React from 'react';
import './index.css';

export function Skeleton({ width = '100%', height = '16px', borderRadius = '4px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="14px" width={`${60 + Math.random() * 40}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} height="14px" width={`${50 + Math.random() * 50}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton height="120px" borderRadius="8px 8px 0 0" />
          <div className="skeleton-card-body">
            <Skeleton height="16px" width="80%" />
            <Skeleton height="12px" width="60%" />
            <div className="skeleton-card-footer">
              <Skeleton height="12px" width="40%" />
              <Skeleton height="12px" width="30%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="skeleton-detail">
      <Skeleton height="32px" width="60%" style={{ marginBottom: '16px' }} />
      <div className="skeleton-detail-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-detail-item">
            <Skeleton height="12px" width="40%" />
            <Skeleton height="20px" width="70%" />
          </div>
        ))}
      </div>
      <Skeleton height="200px" style={{ marginTop: '24px' }} borderRadius="8px" />
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <Skeleton height="32px" width="50%" />
          <Skeleton height="14px" width="70%" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
