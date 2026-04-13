import { useEffect, useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

const OTP_LENGTH = 6;

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const tenantId = params.get('tenantId') || '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = 'Verify Email';
    inputRefs.current[0]?.focus();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleChange(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setAlert(null);
    if (digit && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, j) => { next[j] = ch; });
    setDigits(next);
    const nextEmpty = next.findIndex(d => !d);
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setDigits(prev => prev.map(d => d)); // trigger re-render to show error state
      setAlert({ type: 'error', msg: 'Please enter all 6 digits.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customers/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', msg: data.error || 'Invalid or expired code. Please try again.' });
        return;
      }
      setVerified(true);
    } catch {
      setAlert({ type: 'error', msg: 'Network error. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setAlert(null);
    try {
      const res = await fetch('/api/customers/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', msg: data.error || 'Could not resend OTP.' });
        return;
      }
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setAlert({ type: 'success', msg: 'A new code has been sent to your email.' });
      setTimeout(() => setAlert(null), 4000);
      startCooldown(30);
    } catch {
      setAlert({ type: 'error', msg: 'Network error. Please try again.' });
    }
  }

  if (verified) {
    return (
      <div className="customer-page">
        <div className="otp-card">
          <div className="success-state">
            <div className="check-icon">
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h2>Email verified!</h2>
            <p>Your account has been confirmed. You can close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasError = alert?.type === 'error';

  return (
    <div className="customer-page">
      <div className="otp-card">
        <div className="email-icon">
          <svg viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </div>

        <h1>Check your email</h1>
        <p className="subtitle">We sent a 6-digit code to</p>
        <span className="email-label">{email || 'your email'}</span>

        {alert && <div className={`otp-alert ${alert.type}`}>{alert.msg}</div>}

        <div className="otp-group">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              className={hasError ? 'error' : d ? 'filled' : ''}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
            />
          ))}
        </div>

        <button className="verify-btn" onClick={handleVerify} disabled={loading}>
          {loading ? <><span className="spinner-inline" />Verifying...</> : 'Verify email'}
        </button>

        <div className="resend-row">
          Didn't receive it?&nbsp;
          {cooldown > 0 ? (
            <span className="countdown">Resend in {cooldown}s</span>
          ) : (
            <button className="resend-btn" onClick={handleResend}>
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
