import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './landing.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="qv-landing-page">
      {/* Top Header */}
      <header className="qv-landing-nav">
        <div className="qv-brand qv-nav-brand">
          <div className="qv-brand-logo">Q</div>
          <div className="qv-brand-meta">
            <h3>QuadraVault</h3>
            <span className="qv-nav-tagline">Present a new way to manage your documents</span>
          </div>
        </div>

        <div className="qv-nav-actions">
          <Link to="/login" className="qv-nav-link">Sign In</Link>
          <button onClick={() => navigate('/register')} className="qv-nav-btn">
            Create Account
          </button>
        </div>
      </header>

      {/* Hero Locker Card */}
      <main className="qv-hero-card">
        {/* Brand Meta */}
        <div className="qv-brand qv-hero-brand">
          <div className="qv-brand-logo">V</div>
          <div className="qv-brand-meta">
            <h3>Vaultrix</h3>
            <span>Your Digital Locker • By QuadraVault</span>
          </div>
        </div>

        <div className="qv-hero-layout">
          {/* Text & Actions */}
          <div className="qv-hero-content">
            <h1 className="qv-hero-title">
              Keep Your<br />Documents Safe,<br />Always.
            </h1>
            <p className="qv-hero-tagline">Secure. Organized. Accessible.</p>

            <button
              onClick={() => navigate('/register')}
              className="qv-btn-get-started"
            >
              Get Started <span>➔</span>
            </button>

            <div className="qv-features-row">
              <div className="qv-feature-pill">
                <span className="qv-feat-icon">📄</span>
                <span className="qv-feat-label">Store<br />Documents</span>
              </div>
              <div className="qv-feature-pill">
                <span className="qv-feat-icon">📝</span>
                <span className="qv-feat-label">Manage<br />Notes</span>
              </div>
              <div className="qv-feature-pill">
                <span className="qv-feat-icon">🌐</span>
                <span className="qv-feat-label">Access<br />Anywhere</span>
              </div>
            </div>
          </div>

          {/* Vault Gate & Lamp */}
          <div className="qv-hero-illustration">
            <div className="qv-hanging-lamp-fixture">
              <div className="qv-lamp-cord"></div>
              <div className="qv-lamp-socket"></div>
              <div className="qv-lamp-shade"></div>
              <div className="qv-lamp-bulb"></div>
              <div className="qv-lamp-glow"></div>
            </div>

            <div className="qv-arch-backdrop">
              <div className="qv-floating-cloud">☁️</div>
              <div className="qv-floating-file file-left">📄</div>
              <div className="qv-floating-file file-right">🖼️</div>

              <div className="qv-vault-cube">
                <div className="qv-vault-slot"></div>
                <div className="qv-vault-lock">🔒</div>
              </div>

              <div className="qv-foliage foliage-left">🌿</div>
              <div className="qv-foliage foliage-right">🍃</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}