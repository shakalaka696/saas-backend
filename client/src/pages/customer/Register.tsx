import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function CustomerRegister() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tenantId = params.get('tenantId');

  const [tenantName, setTenantName] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({ firstName: false, lastName: false, email: false });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Create Account';
    if (!tenantId) return;
    fetch(`/api/tenants/${tenantId}`)
      .then(r => r.json())
      .then(data => { if (data?.name) setTenantName(data.name); })
      .catch(() => {});
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div className="customer-page">
        <div className="customer-card">
          <div className="error-page">
            <div className="icon">🚫</div>
            <h1 style={{ fontSize: 18 }}>Invalid registration link</h1>
            <p>This link is missing a tenant ID. Please ask the organization to share the correct link.</p>
          </div>
        </div>
      </div>
    );
  }

  function validate(): boolean {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const e = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      email: !emailValid,
    };
    setErrors(e);
    return !e.firstName && !e.lastName && !e.email;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          tenantId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Registration failed. Please try again.');
        return;
      }
      navigate(`/customer/verify-otp?email=${encodeURIComponent(email.trim())}&tenantId=${encodeURIComponent(tenantId ?? '')}`);
    } catch {
      setFormError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-page">
      <div className="customer-card">
        <div className="customer-logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>

        {tenantName && (
          <div className="tenant-badge">
            <svg viewBox="0 0 24 24">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
            </svg>
            {tenantName}
          </div>
        )}

        <h1>Create your account</h1>
        <p className="subtitle">Enter your details below to get started.</p>

        {formError && <div className="alert alert-error" style={{ marginBottom: 20 }}>{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="register-field">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                value={firstName}
                className={errors.firstName ? 'error' : ''}
                onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: false })); }}
              />
              {errors.firstName && <div className="field-error">Required</div>}
            </div>
            <div className="register-field">
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
                value={lastName}
                className={errors.lastName ? 'error' : ''}
                onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: false })); }}
              />
              {errors.lastName && <div className="field-error">Required</div>}
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="john@example.com"
              autoComplete="email"
              value={email}
              className={errors.email ? 'error' : ''}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: false })); }}
            />
            {errors.email && <div className="field-error">Enter a valid email</div>}
          </div>

          <button type="submit" className="register-submit" disabled={loading}>
            {loading ? <><span className="spinner-inline" />Sending OTP...</> : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
