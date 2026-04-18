import { useEffect, useState, useRef } from 'react';
import { authHeaders } from '../../lib/api';
import type { Segment, Customer } from '../../types';

export default function Segments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [currentSegId, setCurrentSegId] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const originalRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.title = 'Segments — Admin';
    loadSegments();
  }, []);

  function showAlert(type: 'error' | 'success', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  async function loadSegments() {
    try {
      const res = await fetch('/api/admin/segments', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSegments(await res.json());
    } catch {
      showAlert('error', 'Failed to load segments.');
    } finally {
      setLoading(false);
    }
  }

  async function createSegment() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/segments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert('error', data.error || 'Failed to create segment.'); return; }
      setNewName('');
      showAlert('success', `Segment "${name}" created.`);
      await loadSegments();
    } catch { showAlert('error', 'Network error.'); }
    finally { setCreating(false); }
  }

  async function deleteSegment(id: string) {
    if (!confirm('Delete this segment?')) return;
    try {
      const res = await fetch(`/api/admin/segments/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); showAlert('error', d.error || 'Failed to delete.'); return; }
      showAlert('success', 'Segment deleted.');
      await loadSegments();
    } catch { showAlert('error', 'Network error.'); }
  }

  async function openModal(segId: string, segName: string) {
    setCurrentSegId(segId);
    setModalTitle(`Manage Customers — ${segName}`);
    setModalOpen(true);
    setModalLoading(true);

    const [segRes, custRes] = await Promise.all([
      fetch(`/api/admin/segments/${segId}`, { headers: authHeaders() }),
      fetch('/api/admin/customers', { headers: authHeaders() }),
    ]);
    const seg = segRes.ok ? await segRes.json() : {};
    const customers = custRes.ok ? await custRes.json() : [];
    const inSeg = new Set<string>((seg.customers || []).map((c: Customer) => c.id));

    setAllCustomers(customers);
    setSelected(new Set(inSeg));
    originalRef.current = new Set(inSeg);
    setModalLoading(false);
  }

  function toggleCustomer(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveCustomers() {
    if (!currentSegId) return;
    setSaving(true);
    try {
      const current = originalRef.current;
      const toAdd = [...selected].filter(id => !current.has(id));
      const toRemove = [...current].filter(id => !selected.has(id));

      const ops: Promise<Response>[] = [];
      if (toAdd.length) ops.push(fetch(`/api/admin/segments/${currentSegId}/customers`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ customerIds: toAdd }),
      }));
      if (toRemove.length) ops.push(fetch(`/api/admin/segments/${currentSegId}/customers`, {
        method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ customerIds: toRemove }),
      }));

      await Promise.all(ops);
      showAlert('success', 'Segment customers updated.');
      setModalOpen(false);
      await loadSegments();
    } catch { showAlert('error', 'Failed to save changes.'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="page-header">
        <h1>Segments</h1>
        <p>Group customers into segments to target with campaigns.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="create-form">
        <div className="field">
          <label htmlFor="seg-name">New segment name</label>
          <input
            id="seg-name"
            type="text"
            placeholder="e.g. Premium Users, Newsletter Subscribers..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSegment()}
          />
        </div>
        <button className="btn-primary" onClick={createSegment} disabled={creating || !newName.trim()}>
          Create Segment
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : segments.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
          <p>No segments yet. Create one above.</p>
        </div>
      ) : (
        <div className="segments-grid">
          {segments.map(s => (
            <div key={s.id} className="segment-card">
              <div className="seg-name">{s.name}</div>
              <div className="seg-count">{s.customers?.length ?? 0} customer(s)</div>
              <div className="actions">
                <button className="btn-outline" onClick={() => openModal(s.id, s.name)}>
                  Manage Customers
                </button>
                <button className="btn-danger-outline" onClick={() => deleteSegment(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {modalLoading ? (
                <div className="spinner" />
              ) : allCustomers.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: 20 }}>
                  No customers registered yet.
                </p>
              ) : (
                <div className="customer-list">
                  {allCustomers.map(c => (
                    <div
                      key={c.id}
                      className={`customer-item${selected.has(c.id) ? ' selected' : ''}`}
                      onClick={() => toggleCustomer(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="info">
                        <div className="name">{c.firstName} {c.lastName}</div>
                        <div className="email">{c.email}</div>
                      </div>
                      <span className={`badge-small ${c.isVerified ? 'badge-v' : 'badge-u'}`}>
                        {c.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveCustomers} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
