import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/api';
import type { Customer, Campaign } from '../../types';

const STATUS_CONFIG = [
  { key: 'DRAFT' as const, label: 'Draft', cls: 'badge-draft' },
  { key: 'RUNNING' as const, label: 'Running', cls: 'badge-running' },
  { key: 'COMPLETED' as const, label: 'Completed', cls: 'badge-completed' },
  { key: 'FAILED' as const, label: 'Failed', cls: 'badge-failed' },
];

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard — Admin';
    async function load() {
      const [cRes, campRes] = await Promise.all([
        fetch('/api/admin/customers', { headers: authHeaders() }),
        fetch('/api/admin/campaigns', { headers: authHeaders() }),
      ]);
      if (cRes.ok) setCustomers(await cRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const verified = customers.filter(c => c.isVerified).length;
  const byStatus = { DRAFT: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0 };
  campaigns.forEach(c => { if (c.status in byStatus) byStatus[c.status]++; });

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your tenant's activity.</p>
      </div>

      {loading ? (
        <div className="spinner-page"><div className="spinner" style={{ margin: 0 }} />Loading...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Total Customers</div>
              <div className="value">{customers.length}</div>
              <div className="sub">{verified} verified</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Campaigns</div>
              <div className="value">{campaigns.length}</div>
              <div className="sub">{byStatus.COMPLETED} completed</div>
            </div>
            <div className="stat-card">
              <div className="label">Unverified Customers</div>
              <div className="value">{customers.length - verified}</div>
              <div className="sub">pending email verification</div>
            </div>
            <div className="stat-card">
              <div className="label">Active Campaigns</div>
              <div className="value">{byStatus.RUNNING}</div>
              <div className="sub">currently running</div>
            </div>
          </div>

          <div className="section-title">Campaigns by status</div>
          <div className="status-list">
            {STATUS_CONFIG.map(s => (
              <div key={s.key} className="status-row">
                <div className="label-group">
                  <span className={`badge ${s.cls}`}>{s.label}</span>
                  {s.key} campaigns
                </div>
                <span className="status-count">{byStatus[s.key]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
