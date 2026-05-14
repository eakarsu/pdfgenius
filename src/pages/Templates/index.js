import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';

function Templates() {
  const { token } = useAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [klass, setKlass] = useState('invoice');
  const [schemaText, setSchemaText] = useState('{\n  "invoiceNumber": "",\n  "total": 0,\n  "lineItems": []\n}');
  const [postProcText, setPostProcText] = useState('[{"type":"currency","field":"total"}]');
  const [exportFormat, setExportFormat] = useState('json');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function load() {
    const r = await fetch(`/api/templates?page=${page}&pageSize=20`, { headers });
    const d = await r.json();
    setTemplates(d.data || []);
    setTotalPages(d.totalPages || 1);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  async function create() {
    let schema, postProc;
    try {
      schema = JSON.parse(schemaText);
      postProc = JSON.parse(postProcText);
    } catch (e) {
      return alert('Schema or post-processing JSON is invalid');
    }
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        document_class: klass,
        schema,
        post_processing: postProc,
        export_format: exportFormat,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || 'Failed');
    }
    setName('');
    load();
  }

  async function remove(id) {
    if (!window.confirm('Delete template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE', headers });
    load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Document templates</h1>

      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <h3>Create</h3>
        <input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)}
          style={{ display: 'block', marginBottom: 8, padding: 8, width: '100%' }} />
        <select value={klass} onChange={(e) => setKlass(e.target.value)} style={{ marginBottom: 8 }}>
          <option value="invoice">invoice</option>
          <option value="contract">contract</option>
          <option value="lease">lease</option>
          <option value="receipt">receipt</option>
          <option value="custom">custom</option>
        </select>
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="json">json</option>
          <option value="csv">csv</option>
          <option value="quickbooks">quickbooks</option>
          <option value="xlsx">xlsx</option>
        </select>
        <textarea value={schemaText} onChange={(e) => setSchemaText(e.target.value)} rows={6}
          style={{ display: 'block', width: '100%', marginTop: 8, fontFamily: 'monospace' }} />
        <textarea value={postProcText} onChange={(e) => setPostProcText(e.target.value)} rows={3}
          placeholder="[]" style={{ display: 'block', width: '100%', marginTop: 8, fontFamily: 'monospace' }} />
        <button onClick={create} style={{ marginTop: 8 }}>Save template</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Existing templates</h3>
      {templates.map((t) => (
        <div key={t.id} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
          <strong>{t.name}</strong> <small>({t.document_class})</small>
          <button onClick={() => remove(t.id)} style={{ marginLeft: 12 }}>Delete</button>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        Page {page} / {totalPages}
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ marginLeft: 8 }}>Prev</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

export default Templates;
