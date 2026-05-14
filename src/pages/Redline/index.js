import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

/**
 * Per-clause Accept/Reject UI for a comparison.
 */
function Redline() {
  const { id } = useParams();
  const { token } = useAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const [decisions, setDecisions] = useState([]);
  const [merged, setMerged] = useState(null);

  async function load() {
    const res = await fetch(`/api/redline/${id}`, { headers });
    const data = await res.json();
    setDecisions(data.decisions || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function decide(clauseKey, decision, rationale) {
    await fetch(`/api/redline/${id}/clauses/${encodeURIComponent(clauseKey)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ decision, rationale }),
    });
    load();
  }

  async function finalize() {
    const res = await fetch(`/api/redline/${id}/finalize`, { method: 'POST', headers });
    const data = await res.json();
    setMerged(data.merged);
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Redline review</h1>
      <p>Comparison: {id}</p>

      {decisions.map((d) => (
        <div key={d.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 8 }}>
          <div style={{ fontFamily: 'monospace' }}>{d.clause_key}</div>
          <div style={{ marginTop: 8 }}>
            Status: <strong style={{
              color: d.decision === 'ACCEPTED' ? 'green' : d.decision === 'REJECTED' ? 'red' : '#666',
            }}>{d.decision}</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => decide(d.clause_key, 'ACCEPTED')} style={{ marginRight: 8 }}>Accept</button>
            <button onClick={() => decide(d.clause_key, 'REJECTED')} style={{ marginRight: 8 }}>Reject</button>
            <button onClick={() => decide(d.clause_key, 'PENDING')}>Reset</button>
          </div>
        </div>
      ))}

      <button onClick={finalize} style={{ marginTop: 16, padding: '8px 16px' }}>
        Finalize → Build merged document
      </button>

      {merged && (
        <div style={{ marginTop: 24, border: '2px solid #0070f3', padding: 16, borderRadius: 8 }}>
          <h3>Merged result</h3>
          <p>Accepted: {merged.acceptedCount} • Rejected: {merged.rejectedCount} • Pending: {merged.pendingCount}</p>
          {merged.finalSections.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <h4>{s.heading}</h4>
              <small>{s.change}</small>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Redline;
