import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import OtpInput from '../components/OtpInput';
import './auth.css';

// Set to true while backend 2FA routes are not yet implemented
const BYPASS_2FA = true;

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phonenumber: '',
    age: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'scan-qr'
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return setError('Age must be between 1 and 120');
    }

    setLoading(true);

    try {
      // 1. Create account on backend (Succeeds)
      await api.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phonenumber: formData.phonenumber.trim(),
        age: ageNum,
        password: formData.password,
      });

      // 2. Bypass missing 2FA endpoint during dev
      if (BYPASS_2FA) {
        navigate('/login');
        return;
      }

      // 3. Normal TOTP flow when endpoints exist
      const qrRes = await api.post('/auth/setup-totp', {
        email: formData.email.trim().toLowerCase(),
      });

      setQrCodeUrl(qrRes.data.qrCodeUrl);
      setStep('scan-qr');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTotp = async (codeOverride) => {
    const code = codeOverride || otp.join('');
    if (code.length !== 6) return setError('Please enter a 6-digit code');

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/confirm-totp', {
        email: formData.email.trim().toLowerCase(),
        code,
      });

      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid authenticator code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qv-auth-page">
      <div className="qv-card-light">
        {/* Top-Right Decorative Dots */}
        <div className="qv-dots-decoration"></div>

        {/* Brand Header */}
        <div className="qv-brand">
          <div className="qv-brand-logo">V</div>
          <div className="qv-brand-meta">
            <h3>Vaultrix</h3>
            <span>Your Digital Locker • By QuadraVault</span>
          </div>
        </div>

        {step === 'form' ? (
          <>
            <h2 className="qv-title">Create Account</h2>
            <p className="qv-subtitle">Join Vaultrix and keep your files safe.</p>

            {error && <div className="qv-error-alert">{error}</div>}

            <form onSubmit={handleRegisterSubmit} className="qv-form">
              <div className="qv-field">
                <span className="qv-field-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  className="qv-input"
                  required
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

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

              <div className="qv-input-row">
                <div className="qv-field" style={{ flex: 2 }}>
                  <span className="qv-field-icon">📞</span>
                  <input
                    type="tel"
                    name="phonenumber"
                    className="qv-input"
                    required
                    placeholder="Phone number"
                    value={formData.phonenumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="qv-field" style={{ flex: 1 }}>
                  <input
                    type="number"
                    name="age"
                    min="1"
                    max="120"
                    className="qv-input"
                    required
                    placeholder="Age"
                    value={formData.age}
                    onChange={handleChange}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
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

              <div className="qv-field">
                <span className="qv-field-icon">🛡️</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="qv-input"
                  required
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="qv-field-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <button type="submit" disabled={loading} className="qv-btn-dark">
                {loading ? 'Processing...' : 'Register'} <span>➔</span>
              </button>
            </form>

            <p className="qv-footer">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2 className="qv-title">Set Up Authenticator</h2>
            <p className="qv-subtitle">
              Scan this QR code in <strong>Google Authenticator</strong>, then enter the 6-digit code.
            </p>

            {qrCodeUrl && (
              <div className="qv-qr-wrapper">
                <img src={qrCodeUrl} alt="Google Authenticator QR" style={{ width: '170px', height: '170px' }} />
              </div>
            )}

            {error && <div className="qv-error-alert">{error}</div>}

            <OtpInput
              otp={otp}
              setOtp={setOtp}
              onComplete={(code) => handleConfirmTotp(code)}
              disabled={loading}
            />

            <button
              onClick={() => handleConfirmTotp()}
              disabled={loading || otp.join('').length < 6}
              className="qv-btn-dark"
            >
              {loading ? 'Activating...' : 'Activate & Finish'} <span>➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}