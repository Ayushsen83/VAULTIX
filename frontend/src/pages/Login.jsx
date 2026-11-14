import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import OtpInput from "../components/OtpInput";
import "./Auth.css";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [sharedDevice, setSharedDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // If Shared Device mode is active, wipe any browser storage when the tab closes
  useEffect(() => {
    if (!sharedDevice) return;

    sessionStorage.setItem("vaultix_shared_device", "true");

    const handleBeforeUnload = () => {
      localStorage.clear();
      sessionStorage.clear();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sharedDevice]);

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

      if (sharedDevice) {
        sessionStorage.setItem("vaultix_shared_device", "true");
      } else {
        sessionStorage.removeItem("vaultix_shared_device");
      }

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

      // If 2FA is not enabled, the backend sets the authenticated HttpOnly cookie.
      if (res.data?.success === true) {
        if (sharedDevice) {
          setFormData({ email: "", password: "" });
        }
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

      setChallengeToken("");
      setOtp(["", "", "", "", "", ""]);
      if (sharedDevice) {
        setFormData({ email: "", password: "" });
      }

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
          <img
            src="/QuadravaulLogo.png"
            alt="Vaultix Logo"
            className="qv-brand-logo-img"
          />

          <div className="qv-brand-meta">
            <h3>Vaultix</h3>
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

            <form
              onSubmit={handlePasswordSubmit}
              className="qv-form"
              autoComplete={sharedDevice ? "off" : "on"}
            >
              <div className="qv-field">
                <span className="qv-field-icon">✉️</span>

                <input
                  type="email"
                  name="email"
                  className="qv-input"
                  required
                  maxLength={255}
                  placeholder="Email address"
                  autoComplete={sharedDevice ? "off" : "email"}
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
                  autoComplete={sharedDevice ? "new-password" : "current-password"}
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
                <label
                  className="qv-checkbox"
                  title="Disables browser autofill and wipes local storage when closing the tab"
                >
                  <input
                    type="checkbox"
                    checked={sharedDevice}
                    onChange={(e) => setSharedDevice(e.target.checked)}
                  />
                  Shared device mode
                </label>

                <Link to="/forgot-password" className="qv-forgot-link">
                  Forgot password?
                </Link>
              </div>

              {sharedDevice && (
                <p
                  style={{
                    fontSize: "0.74rem",
                    color: "#e28766",
                    margin: "-0.35rem 0 0.25rem 0",
                    textAlign: "left",
                  }}
                >
                  🛡️ Autofill disabled &amp; local data auto-wipes on tab close.
                </p>
              )}

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