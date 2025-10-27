import React, { useState } from 'react';
import './AuthPage.css';
import logo from './assets/logo.png';

export default function AuthPage({ onAuthed }) {
  // modes: login | signup | reset
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const isEmailValid = (val) => /\S+@\S+\.\S+/.test(val);
  const isPasswordStrong = (val) => val.length >= 6;

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
  };

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  const postJSON = async (path, body) => {
    const res = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // include cookies from your server
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.message || 'Request failed';
      throw new Error(msg);
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!isEmailValid(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode !== 'reset' && !isPasswordStrong(password)) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await postJSON('/api/login', { email, password });
        setMessage('Logged in successfully.');
        onAuthed?.(); // optionally navigate to dashboard
      } else if (mode === 'signup') {
        await postJSON('/api/register', { email, password });
        setMessage('Verification email sent! Account created.');
        // you can auto-login after register if your server returns a token
      } else if (mode === 'reset') {
        await postJSON('/api/reset-password', { email });
        setMessage('Password reset email sent. Check your inbox.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const headerTitle =
    mode === 'login' ? 'Sign in'
    : mode === 'signup' ? 'Create account'
    : 'Reset password';

  return (
    <div className="auth-root">
      <div className="auth-appbar">
        <div className="auth-brand">
          <div className="auth-brand-icon"><img src={logo} alt="FloorTrack" /></div>
          <div className="auth-brand-text">FloorTrack</div>
        </div>
        <button className="auth-live-btn">
          <span className="auth-dot" />
          Secure
        </button>
      </div>

      <div className="auth-grid">
        {/* Left panel: form */}
        <div className="auth-panel">
          <div className="auth-panel-header">
            <div className="auth-panel-title">{headerTitle}</div>
            <div className="auth-secure-pill">Protected</div>
          </div>

          <div className="auth-panel-body">
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`auth-input ${email && !isEmailValid(email) ? 'is-invalid' : ''}`}
              />

              {mode !== 'reset' && (
                <>
                  <label className="auth-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`auth-input ${password && !isPasswordStrong(password) ? 'is-invalid' : ''}`}
                  />
                </>
              )}

              {mode === 'signup' && (
                <>
                  <label className="auth-label">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`auth-input ${confirm && confirm !== password ? 'is-invalid' : ''}`}
                  />
                </>
              )}

              {error && <div className="auth-alert auth-alert-error">{error}</div>}
              {message && <div className="auth-alert auth-alert-success">{message}</div>}

              <button type="submit" disabled={loading} className="auth-primary-btn">
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
              </button>

              <div className="auth-actions-row">
                {mode === 'login' && (
                  <>
                    <button type="button" onClick={() => { clearAlerts(); setMode('reset'); }} className="auth-link-btn">
                      Forgot password?
                    </button>
                    <span className="auth-sep">•</span>
                    <button type="button" onClick={() => { clearAlerts(); setMode('signup'); }} className="auth-link-btn">
                      Create account
                    </button>
                  </>
                )}
                {mode === 'signup' && (
                  <button type="button" onClick={() => { clearAlerts(); setMode('login'); }} className="auth-link-btn">
                    Have an account? Sign in
                  </button>
                )}
                {mode === 'reset' && (
                  <button type="button" onClick={() => { clearAlerts(); setMode('login'); }} className="auth-link-btn">
                    Back to sign in
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right panel: status/legend for visual parity */}
        <div className="auth-side">
          <div className="auth-side-header">
            <div className="auth-side-title">Account status</div>
            <div className="auth-status-pill">Active</div>
          </div>

          <div className="auth-metrics">
            <div className="auth-metric-card">
              <span className="auth-metric-dot dot-cyan" />
              <div>
                <div className="auth-metric-label">Policy</div>
                <div className="auth-metric-value">Email + Password</div>
              </div>
            </div>
            <div className="auth-metric-card">
              <span className="auth-metric-dot dot-amber" />
              <div>
                <div className="auth-metric-label">Sessions</div>
                <div className="auth-metric-value">Per-device</div>
              </div>
            </div>
            <div className="auth-metric-card">
              <span className="auth-metric-dot dot-green" />
              <div>
                <div className="auth-metric-label">State</div>
                <div className="auth-metric-value">Secure</div>
              </div>
            </div>
          </div>

          <div className="auth-legend">
            <div className="auth-legend-item"><span className="legend-dot dot-red" /> High risk</div>
            <div className="auth-legend-item"><span className="legend-dot dot-amber" /> Medium risk</div>
            <div className="auth-legend-item"><span className="legend-dot dot-cyan" /> Low risk</div>
          </div>
        </div>
      </div>
    </div>
  );
}
