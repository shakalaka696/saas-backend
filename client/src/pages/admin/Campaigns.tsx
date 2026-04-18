import { useEffect, useState, useRef } from 'react';
import { authHeaders } from '../../lib/api';
import type { Campaign, Segment, CampaignStatus } from '../../types';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  // Create form
  const [cName, setCName] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cBody, setCBody] = useState('');
  const [creating, setCreating] = useState(false);

  // Segments modal
  const [segModalOpen, setSegModalOpen] = useState(false);
  const [allSegments, setAllSegments] = useState<Segment[]>([]);
  const [selectedSegs, setSelectedSegs] = useState<Set<string>>(new Set());
  const originalSegsRef = useRef<Set<string>>(new Set());
  const [savingSegs, setSavingSegs] = useState(false);
  const [segModalLoading, setSegModalLoading] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  // Status modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalTitle, setStatusModalTitle] = useState('');
  const [statusCampaignId, setStatusCampaignId] = useState<string | null>(null);
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    document.title = 'Campaigns — Admin';
    loadCampaigns();
  }, []);

  function showAlert(type: 'error' | 'success', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/admin/campaigns', { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setCampaigns(await res.json());
    } catch {
      showAlert('error', 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    const name = cName.trim();
    const subject = cSubject.trim();
    const body = cBody.trim();
    if (!name || !subject || !body) { showAlert('error', 'All fields are required.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert('error', data.error || 'Failed to create.'); return; }
      setCName(''); setCSubject(''); setCBody('');
      showAlert('success', `Campaign "${name}" created.`);
      await loadCampaigns();
    } catch { showAlert('error', 'Network error.'); }
    finally { setCreating(false); }
  }

  async function executeCampaign(id: string) {
    if (!confirm('Execute this campaign? Emails will be sent to all verified customers in attached segments.')) return;
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, _executing: true } as Campaign & { _executing: boolean } : c));
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/execute`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { showAlert('error', data.error || 'Failed to execute.'); return; }
      showAlert('success', `Campaign started! ${data.recipientCount || ''} emails queued.`);
      await loadCampaigns();
    } catch { showAlert('error', 'Network error.'); }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); showAlert('error', d.error || 'Failed to delete.'); return; }
      showAlert('success', 'Campaign deleted.');
      await loadCampaigns();
    } catch { showAlert('error', 'Network error.'); }
  }

  async function openSegModal(campaignId: string) {
    setCurrentCampaignId(campaignId);
    setSegModalOpen(true);
    setSegModalLoading(true);
    const [camRes, segRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { headers: authHeaders() }),
      fetch('/api/admin/segments', { headers: authHeaders() }),
    ]);
    const camp = camRes.ok ? await camRes.json() : {};
    const segs = segRes.ok ? await segRes.json() : [];
    const attached = new Set<string>((camp.segments || []).map((s: Segment) => s.id));
    setAllSegments(segs);
    setSelectedSegs(new Set(attached));
    originalSegsRef.current = new Set(attached);
    setSegModalLoading(false);
  }

  function toggleSeg(id: string) {
    setSelectedSegs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveSegments() {
    if (!currentCampaignId) return;
    setSavingSegs(true);
    try {
      const current = originalSegsRef.current;
      const toAdd = [...selectedSegs].filter(id => !current.has(id));
      const toRemove = [...current].filter(id => !selectedSegs.has(id));
      const ops: Promise<Response>[] = [];
      if (toAdd.length) ops.push(fetch(`/api/admin/campaigns/${currentCampaignId}/segments`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ segmentIds: toAdd }),
      }));
      if (toRemove.length) ops.push(fetch(`/api/admin/campaigns/${currentCampaignId}/segments`, {
        method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ segmentIds: toRemove }),
      }));
      await Promise.all(ops);
      showAlert('success', 'Segments updated.');
      setSegModalOpen(false);
      await loadCampaigns();
    } catch { showAlert('error', 'Failed to save.'); }
    finally { setSavingSegs(false); }
  }

  async function openStatusModal(id: string, name: string) {
    setStatusCampaignId(id);
    setStatusModalTitle(`Status — ${name}`);
    setStatusModalOpen(true);
    await refreshStatus(id);
  }

  async function refreshStatus(id?: string) {
    const cid = id ?? statusCampaignId;
    if (!cid) return;
    setStatusLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${cid}/status`, { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
    } finally {
      setStatusLoading(false);
    }
  }

  function badgeCls(s: Campaign['status']) {
    return { DRAFT: 'badge-draft', RUNNING: 'badge-running', COMPLETED: 'badge-completed', FAILED: 'badge-failed' }[s];
  }

  return (
    <>
      <div className="page-header">
        <h1>Campaigns</h1>
        <p>Create, manage, and execute email campaigns.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="two-col">
        <div className="panel">
          <h2>New Campaign</h2>
          <div className="field">
            <label htmlFor="c-name">Campaign name</label>
            <input id="c-name" type="text" placeholder="e.g. Summer Promo 2025" value={cName} onChange={e => setCName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-subject">Email subject</label>
            <input id="c-subject" type="text" placeholder="e.g. Exclusive offer just for you" value={cSubject} onChange={e => setCSubject(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-body">Email body (HTML supported)</label>
            <textarea
              id="c-body"
              placeholder={'Dear {{firstName}},\n\nWe have an exclusive offer...'}
              value={cBody}
              onChange={e => setCBody(e.target.value)}
            />
          </div>
          <button className="btn-primary-full" onClick={createCampaign} disabled={creating}>
            {creating ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>

        <div className="panel">
          <h2>All Campaigns</h2>
          {loading ? (
            <div className="spinner" />
          ) : campaigns.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No campaigns yet. Create one on the left.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </td>
                    <td><span className={`badge ${badgeCls(c.status)}`}>{c.status}</span></td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-row">
                        <button
                          className="btn-sm btn-sm-indigo"
                          onClick={() => openSegModal(c.id)}
                          disabled={c.status !== 'DRAFT'}
                        >Segments</button>
                        <button
                          className="btn-sm btn-sm-green"
                          onClick={() => executeCampaign(c.id)}
                          disabled={c.status !== 'DRAFT'}
                        >Execute</button>
                        <button
                          className="btn-sm btn-sm-gray"
                          onClick={() => openStatusModal(c.id, c.name)}
                        >Status</button>
                        <button
                          className="btn-sm btn-sm-red"
                          onClick={() => deleteCampaign(c.id)}
                          disabled={c.status !== 'DRAFT'}
                        >Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Segments Modal */}
      {segModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSegModalOpen(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>Attach Segments</h3>
              <button className="modal-close" onClick={() => setSegModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {segModalLoading ? (
                <div className="spinner" />
              ) : allSegments.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20, fontSize: 14 }}>
                  No segments created yet.{' '}
                  <a href="/admin/segments" style={{ color: '#6366f1' }}>Create one</a>.
                </p>
              ) : (
                <div className="seg-check-list">
                  {allSegments.map(s => (
                    <div
                      key={s.id}
                      className={`seg-check-item${selectedSegs.has(s.id) ? ' selected' : ''}`}
                      onClick={() => toggleSeg(s.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSegs.has(s.id)}
                        onChange={() => toggleSeg(s.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div>
                        <div className="name">{s.name}</div>
                        <div className="count">{(s.customers || []).length} customer(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setSegModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveSegments} disabled={savingSegs}>
                {savingSegs ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setStatusModalOpen(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>{statusModalTitle}</h3>
              <button className="modal-close" onClick={() => setStatusModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {statusLoading || !status ? (
                <div className="spinner" />
              ) : (
                <div className="status-grid">
                  <div className="status-box"><div className="label">Total</div><div className="value">{status.total}</div></div>
                  <div className="status-box"><div className="label">Sent</div><div className="value" style={{ color: '#15803d' }}>{status.sent}</div></div>
                  <div className="status-box"><div className="label">Pending</div><div className="value" style={{ color: '#1d4ed8' }}>{status.pending}</div></div>
                  <div className="status-box"><div className="label">Failed</div><div className="value" style={{ color: '#ef4444' }}>{status.failed}</div></div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setStatusModalOpen(false)}>Close</button>
              <button className="btn-sm btn-sm-indigo" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => refreshStatus()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
