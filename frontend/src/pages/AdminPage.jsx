import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

function StatCard({ label, value, accent }) {
  return (
    <div className="admin-stat-card" style={{ borderTopColor: accent }}>
      <div className="admin-stat-value">{value ?? '—'}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

export default function AdminPage({ token }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [families, setFamilies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  const LIMIT = 20;

  async function loadStats() {
    try {
      const data = await apiRequest('/admin/stats', { token });
      setStats(data);
    } catch (err) {
      setError(err.message || 'Could not load stats');
    }
  }

  async function loadFamilies(p = page, q = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (q) params.set('search', q);
      const data = await apiRequest(`/admin/families?${params}`, { token });
      setFamilies(data.families || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Could not load families');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    loadFamilies(1, '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleAdmin(family) {
    const newVal = !family.isAdmin;
    try {
      await apiRequest(`/admin/families/${family.id}/admin`, {
        method: 'PATCH',
        token,
        body: { isAdmin: newVal }
      });
      setAdminMsg(`${family.name} admin flag ${newVal ? 'granted' : 'revoked'}.`);
      setTimeout(() => setAdminMsg(''), 3000);
      loadFamilies(page, search);
    } catch (err) {
      setAdminMsg(err.message || 'Could not update admin flag');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
    loadFamilies(1, searchInput);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button type="button" className="settings-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <h1>Admin Dashboard</h1>
        <span className="admin-badge">Admin Only</span>
      </header>

      {error && <p className="error admin-error">{error}</p>}

      {/* ── Stats ── */}
      {stats && (
        <section className="admin-stats-grid">
          <StatCard label="Total Parents"        value={stats.totalParents}        accent="#818cf8" />
          <StatCard label="Total Children"       value={stats.totalChildren}       accent="#34d399" />
          <StatCard label="Total Tasks"          value={stats.totalTasks}          accent="#fb923c" />
          <StatCard label="Approved Tasks"       value={stats.approvedTasks}       accent="#4ade80" />
          <StatCard label="Pending Approvals"    value={stats.pendingApprovals}    accent="#fbbf24" />
          <StatCard label="Active Gaming Sessions" value={stats.activeGamingSessions} accent="#f472b6" />
        </section>
      )}

      {/* ── Families table ── */}
      <section className="panel admin-families-panel">
        <div className="admin-families-header">
          <h2>Families ({total})</h2>
          <form onSubmit={handleSearch} className="admin-search-form">
            <input
              type="search"
              className="settings-input admin-search-input"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="settings-action-btn">Search</button>
          </form>
        </div>

        {adminMsg && <p className="notice" role="status">{adminMsg}</p>}

        {loading ? (
          <p className="admin-loading">Loading…</p>
        ) : families.length === 0 ? (
          <p className="admin-empty">No families found.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Children</th>
                    <th>Joined</th>
                    <th>Admin</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.name}</strong>
                        {f.isAdmin ? <span className="admin-tag">admin</span> : null}
                      </td>
                      <td>{f.email}</td>
                      <td>{f.childCount}</td>
                      <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td>{f.isAdmin ? 'Yes' : 'No'}</td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className={f.isAdmin ? 'settings-danger-btn' : 'settings-action-btn'}
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
                          onClick={() => handleToggleAdmin(f)}
                        >
                          {f.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); loadFamilies(p, search); }}
                >
                  ← Prev
                </button>
                <span className="admin-page-info">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); loadFamilies(p, search); }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
