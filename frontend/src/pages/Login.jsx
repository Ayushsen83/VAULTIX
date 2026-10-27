import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { refreshCsrfToken } from '../services/api';
import OtpInput from '../components/OtpInput';
import './uth.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'totp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // API CALL 4: Authenticate credentials
      const res = await api.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Prepare fresh CSRF token for the 2FA challenge request
      await refreshCsrfToken();

      // If user requires 2FA or backend signals 2FA challenge
      if (res.data?.require2FA || res.status === 200) {
        setStep('totp');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (codeOverride) => {
    const code = codeOverride || otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit code');

    setError('');
    setLoading(true);

    try {
      // API CALL 5: Verify 2FA challenge code
      await api.post('/auth/2fa/verify-login', {
        email: formData.email.trim().toLowerCase(),
        code,
      });

      // Clean up session CSRF token
      sessionStorage.removeItem('csrf_token');

      // Navigate to Dashboard
      navigate('/home');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Invalid authenticator code. Check your Google Authenticator and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qv-auth-page">
      <div className="qv-card-dark">
        {/* Brand Header */}
        <div className="qv-brand">
          <div className="qv-brand-logo">V</div>
          <div className="qv-brand-meta">
            <h3>Vaultrix</h3>
            <span>Your Digital Locker • By QuadraVault</span>
          </div>
        </div>

        {step === 'credentials' ? (
          <>
            <h2 className="qv-title">Welcome Back!</h2>
            <p className="qv-subtitle">Login to access your locker.</p>

            {error && <div className="qv-error-alert">{error}</div>}

            <form onSubmit={handlePasswordSubmit} className="qv-form">
              <div className="qv-field">
                <span className="qv-field-icon">✉️</span>
                <input
                  type="email"
                  name="email"
                  className="qv-input"
                  required
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="qv-field">
                <span className="qv-field-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="qv-input"
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="qv-field-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="qv-extra-actions">
                <label className="qv-checkbox">
                  <input type="checkbox" />
                  Remember me
                </label>
                <a href="#forgot" className="qv-forgot-link">Forgot password?</a>
              </div>

              <button type="submit" disabled={loading} className="qv-btn-orange">
                {loading ? 'Checking...' : 'Login'} <span>➔</span>
              </button>
            </form>

            <p className="qv-footer">
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2 className="qv-title">Two-Factor Auth</h2>
            <p className="qv-subtitle">Enter the 6-digit code from Google Authenticator.</p>

            {error && <div className="qv-error-alert">{error}</div>}

            <OtpInput
              otp={otp}
              setOtp={setOtp}
              onComplete={(code) => handleTotpSubmit(code)}
              disabled={loading}
            />

            <button
              onClick={() => handleTotpSubmit()}
              disabled={loading || otp.join('').length < 6}
              className="qv-btn-orange"
            >
              {loading ? 'Verifying...' : 'Verify'} <span>➔</span>
            </button>

            <p className="qv-footer">
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setOtp(['', '', '', '', '', '']);
                }}
                style={{ background: 'none', border: 'none', color: '#e28766', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                ← Back to Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}