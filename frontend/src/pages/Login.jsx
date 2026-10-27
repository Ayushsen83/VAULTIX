
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import OtpInput from "../components/OtpInput";
import "./Auth.css";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // STEP 1: Authenticate using email and password.
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // If 2FA is enabled, the backend returns a restricted challenge.
      if (res.data?.requiresTwoFactor === true) {
        const temporaryChallenge = res.data?.challengeToken;

        if (
          typeof temporaryChallenge !== "string" ||
          !temporaryChallenge
        ) {
          throw new Error("The server did not return a 2FA challenge.");
        }

        setChallengeToken(temporaryChallenge);
        setOtp(["", "", "", "", "", ""]);
        setStep("totp");
        return;
      }

      // If 2FA is not enabled, the backend should already have set
      // the authenticated HttpOnly cookie.
      if (res.data?.success === true) {
        navigate("/home", { replace: true });
        return;
      }

      throw new Error("Login could not be completed.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify the authenticator code using the challenge token.
  const handleTotpSubmit = async (codeOverride) => {
    const code = String(codeOverride || otp.join(""));

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete 6-digit authenticator code.");
      return;
    }

    if (!challengeToken) {
      setError("Your login challenge has expired. Please log in again.");
      setStep("credentials");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/2fa/verify-login", {
         challengeToken,
        token: code,
      });

      if (res.data?.success !== true) {
        throw new Error("Two-factor verification failed.");
      }

      // The backend must set the authenticated HttpOnly cookie.
      setChallengeToken("");
      setOtp(["", "", "", "", "", ""]);

      navigate("/home", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Invalid authenticator code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep("credentials");
    setChallengeToken("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="qv-auth-page">
      <div className="qv-card-dark">
        <div className="qv-brand">
          <div className="qv-brand-logo">V</div>

          <div className="qv-brand-meta">
            <h3>Vaultrix</h3>
            <span>Your Digital Locker • By QuadraVault</span>
          </div>
        </div>

        {step === "credentials" ? (
          <>
            <h2 className="qv-title">Welcome Back!</h2>
            <p className="qv-subtitle">
              Login to access your locker.
            </p>

            {error && (
              <div className="qv-error-alert" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="qv-form">
              <div className="qv-field">
                <span className="qv-field-icon">✉️</span>

                <input
                  type="email"
                  name="email"
                  className="qv-input"
                  required
                  maxLength={255}
                  placeholder="Email address"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="qv-field">
                <span className="qv-field-icon">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="qv-input"
                  required
                  maxLength={128}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="qv-field-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="qv-extra-actions">
                <label className="qv-checkbox">
                  <input type="checkbox" />
                  Remember me
                </label>

                <Link to="/forgot-password" className="qv-forgot-link">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="qv-btn-orange"
              >
                {loading ? "Checking..." : "Login"}
                <span>➔</span>
              </button>
            </form>

            <p className="qv-footer">
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <h2 className="qv-title">Two-Factor Authentication</h2>

            <p className="qv-subtitle">
              Enter the six-digit code from Google Authenticator.
            </p>

            {error && (
              <div className="qv-error-alert" role="alert">
                {error}
              </div>
            )}

            <OtpInput
              otp={otp}
              setOtp={setOtp}
              onComplete={handleTotpSubmit}
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => handleTotpSubmit()}
              disabled={loading || otp.join("").length !== 6}
              className="qv-btn-orange"
            >
              {loading ? "Verifying..." : "Verify"}
              <span>➔</span>
            </button>

            <p className="qv-footer">
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e28766",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                }}
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
