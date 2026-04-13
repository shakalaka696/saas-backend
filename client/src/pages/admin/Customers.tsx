import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/api';
import type { Customer } from '../../types';

type Filter = 'all' | 'true' | 'false';

export default function Customers() {
  const [all, setAll] = useState<Customer[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  useEffect(() => {
    document.title = 'Customers — Admin';
    fetch('/api/admin/customers', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { setAll(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function showAlert(type: 'error' | 'success', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const d = await res.json();
      showAlert('error', d.error || 'Failed to delete customer.');
      return;
    }
    setAll(prev => prev.filter(c => c.id !== id));
    showAlert('success', 'Customer deleted.');
  }

  const q = search.toLowerCase();
  let data = all;
  if (filter === 'true') data = data.filter(c => c.isVerified);
  if (filter === 'false') data = data.filter(c => !c.isVerified);
  if (q) data = data.filter(c =>
    c.email.toLowerCase().includes(q) ||
    c.firstName.toLowerCase().includes(q) ||
    c.lastName.toLowerCase().includes(q)
  );

  return (
    <>
      <div className="page-header">
        <h1>Customers</h1>
        <p>All customers registered in your tenant.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="filter-tabs">
        {(['all', 'true', 'false'] as Filter[]).map(f => (
          <button
            key={f}
            className={`tab${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'true' ? 'Verified' : 'Unverified'}
          </button>
        ))}
      </div>

      <div className="search-box">
        <svg viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="spinner" />
      ) : data.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <p>No customers found</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id}>
                <td>{c.firstName} {c.lastName}</td>
                <td>{c.email}</td>
                <td>
                  {c.isVerified
                    ? <span className="badge-verified">Verified</span>
                    : <span className="badge-unverified">Unverified</span>}
                </td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="delete-btn" title="Delete customer" onClick={() => deleteCustomer(c.id)}>
                    <svg viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
