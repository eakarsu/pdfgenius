import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';

/**
 * Multi-document RAG chat. User picks documents, system creates a chat,
 * then sends questions answered with citations.
 */
function RagChat() {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/documents?pageSize=100', { headers })
      .then((r) => r.json())
      .then((d) => setDocs(d.data || d.documents || []));
    fetch('/api/rag/chats', { headers })
      .then((r) => r.json())
      .then((d) => setChats(d.data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createChat() {
    if (selected.length === 0) return;
    const res = await fetch('/api/rag/chats', {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentIds: selected, title: `Chat (${selected.length} docs)` }),
    });
    const c = await res.json();
    setChats([c, ...chats]);
    openChat(c.id);
  }

  async function openChat(id) {
    const res = await fetch(`/api/rag/chats/${id}`, { headers });
    const data = await res.json();
    setActiveChat(data);
    setMessages(data.messages || []);
  }

  async function sendQuestion() {
    if (!activeChat || !question) return;
    setBusy(true);
    const userMsg = { role: 'user', content: question };
    setMessages((m) => [...m, userMsg]);
    const res = await fetch(`/api/rag/chats/${activeChat.id}/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question }),
    });
    setQuestion('');
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, citations: data.citations }]);
    } else {
      const err = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${err.error}` }]);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Multi-document RAG Chat</h1>

      {!activeChat && (
        <div>
          <h3>Pick documents</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {docs.map((d) => (
              <label key={d.id} style={{ display: 'flex', gap: 8, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(d.id)}
                  onChange={() =>
                    setSelected((s) => (s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id]))
                  }
                />
                <span>{d.original_name || d.name || d.id}</span>
              </label>
            ))}
          </div>
          <button onClick={createChat} disabled={selected.length === 0} style={{ marginTop: 16, padding: '8px 16px' }}>
            Start chat
          </button>

          <h3 style={{ marginTop: 32 }}>Recent chats</h3>
          {chats.map((c) => (
            <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
              <button onClick={() => openChat(c.id)} style={{ background: 'none', border: 'none', color: '#0070f3' }}>
                {c.title}
              </button>{' '}
              <small>{new Date(c.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}

      {activeChat && (
        <div>
          <button onClick={() => setActiveChat(null)} style={{ marginBottom: 16 }}>← Back to chats</button>
          <h3>{activeChat.title}</h3>
          <div style={{ height: 400, overflow: 'auto', border: '1px solid #eee', padding: 16, marginBottom: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 'bold' }}>{m.role}</div>
                <div>{m.content}</div>
                {m.citations && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Citations:{' '}
                    {m.citations.map((c, k) => (
                      <span key={k} style={{ marginRight: 8 }}>
                        [{c.documentId.slice(0, 8)} pp.{c.pageStart}-{c.pageEnd} sim={c.score?.toFixed(2)}]
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              style={{ flex: 1, padding: 8 }}
              onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
            />
            <button onClick={sendQuestion} disabled={busy}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RagChat;
