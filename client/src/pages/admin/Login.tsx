import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin Login';
    if (getToken()) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  function validate(): boolean {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const passwordOk = password.length > 0;
    setEmailError(!emailOk);
    setPasswordError(!passwordOk);
    return emailOk && passwordOk;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user || {}));
      navigate('/admin/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>

        <h1>Admin Portal</h1>
        <p className="subtitle">Sign in to manage campaigns and customers.</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="admin@company.com"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(false); }}
              className={emailError ? 'error' : ''}
            />
            {emailError && <div className="field-error">Enter a valid email</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
              className={passwordError ? 'error' : ''}
            />
            {passwordError && <div className="field-error">Password is required</div>}
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <><span className="spinner-inline" />Signing in...</> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
