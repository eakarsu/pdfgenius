import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';

function AIUsage() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [data, setData] = useState([]);
  const [byFeature, setByFeature] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/ai-usage?days=${days}&page=${page}&pageSize=50`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setData(d.data || []);
        setByFeature(d.byFeature || []);
        setTotalCost(d.totalCostUsd || 0);
        setTotalPages(d.totalPages || 1);
      });
    // eslint-disable-next-line
  }, [days, page]);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>AI usage</h1>
      <div style={{ marginBottom: 16 }}>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{ marginRight: 8 }}>{d}d</button>
        ))}
      </div>

      <div style={{ fontSize: 24, marginBottom: 16 }}>Total cost: ${totalCost.toFixed(4)}</div>

      <h3>By feature</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Feature</th><th>Calls</th><th>Tokens in</th><th>Tokens out</th><th>Cost</th></tr></thead>
        <tbody>
          {byFeature.map((r) => (
            <tr key={r.feature}>
              <td>{r.feature}</td>
              <td align="center">{r.calls}</td>
              <td align="center">{r.tokensIn || 0}</td>
              <td align="center">{r.tokensOut || 0}</td>
              <td align="center">${parseFloat(r.cost || 0).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Recent calls</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th>When</th><th>Feature</th><th>Model</th><th>Duration</th><th>Cost</th><th>Error</th></tr></thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.createdAt).toLocaleString()}</td>
              <td>{row.feature}</td>
              <td>{row.model || '-'}</td>
              <td>{row.duration_ms ? row.duration_ms + 'ms' : '-'}</td>
              <td>{row.cost_usd != null ? '$' + parseFloat(row.cost_usd).toFixed(4) : '-'}</td>
              <td style={{ color: 'red' }}>{row.error || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        Page {page} / {totalPages}
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ marginLeft: 8 }}>Prev</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

export default AIUsage;
