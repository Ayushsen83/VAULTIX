import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import OtpInput from "../components/OtpInput";
import "./Auth.css";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phonenumber: "",
    age: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState("form");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualSetupKey, setManualSetupKey] = useState("");
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

  // STEP 1: Register and automatically request the QR code.
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const cleanPhone = formData.phonenumber.trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Mobile number must be 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    const ageNum = Number(formData.age);

    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
      setError("Age must be an integer between 1 and 120.");
      return;
    }

    if (formData.password.length < 12 || formData.password.length > 128) {
      setError("Password must be between 12 and 128 characters.");
      return;
    }

    setLoading(true);

    try {
      // Remove any previous incomplete registration challenge.
      sessionStorage.removeItem("registration_token");

      // 1. Create a pending account.
      const regRes = await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phonenumber: cleanPhone,
        age: ageNum,
        password: formData.password,
      });

      const registrationToken = regRes.data?.registrationToken;

      if (
        typeof registrationToken !== "string" ||
        !registrationToken
      ) {
        throw new Error(
          "Registration challenge token was not returned by the server."
        );
      }

      // 2. Save the short-lived registration challenge.
      sessionStorage.setItem("registration_token", registrationToken);

      // 3. Generate the registration-specific QR code.
      // Do not call the existing-account /auth/2fa/setup endpoint.
      const qrRes = await api.post("/auth/register/2fa/setup", {
        registrationToken,
      });

      const qr =
        qrRes.data?.qrCode ||
        qrRes.data?.qrCodeUrl ||
        qrRes.data?.qr;

      if (typeof qr !== "string" || !qr) {
        throw new Error("The server did not return a QR code.");
      }

      setQrCodeUrl(qr);
      setManualSetupKey(qrRes.data?.manualSetupKey || "");
      setOtp(["", "", "", "", "", ""]);
      setStep("scan-qr");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify the OTP, activate the account, and continue to dashboard.
  const handleConfirmTotp = async (codeOverride) => {
    const code = String(codeOverride || otp.join(""));

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter a valid 6-digit authenticator code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const registrationToken = sessionStorage.getItem(
        "registration_token"
      );

      if (!registrationToken) {
        throw new Error(
          "Your registration session has expired. Please register again."
        );
      }

      // This endpoint must verify the OTP, activate the account,
      // and set the authenticated vaultix_token HttpOnly cookie.
      const verifyRes = await api.post("/auth/register/2fa/verify", {
        registrationToken,
        token: code,
      });

      if (verifyRes.data?.registrationComplete !== true) {
        throw new Error(
          "Registration could not be completed. Please try again."
        );
      }

      // Remove temporary registration credentials.
      sessionStorage.removeItem("registration_token");
      sessionStorage.removeItem("csrf_token");

      // Clear sensitive form values.
      setFormData({
        name: "",
        email: "",
        phonenumber: "",
        age: "",
        password: "",
        confirmPassword: "",
      });

      // Account should now be authenticated through the HttpOnly cookie.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "OTP verification failed. Check your authenticator code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qv-auth-page">
      <div className="qv-card-light">
        <div className="qv-dots-decoration" />

        <div className="qv-brand">
          {/* <div className="qv-brand-logo">V</div> */}
          <img src="/QuadravaulLogo.png"alt="Vaultrix Logo"className="qv-brand-logo-img"/>

          <div className="qv-brand-meta">
            <h3>Vaultrix</h3>
            <span>Your Digital Locker • By QuadraVault</span>
          </div>
        </div>

        {step === "form" ? (
          <>
            <h2 className="qv-title">Create Account</h2>

            <p className="qv-subtitle">
              Join Vaultrix and keep your files safe.
            </p>

            {error && (
              <div className="qv-error-alert" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="qv-form">
              <div className="qv-field">
                <span className="qv-field-icon">👤</span>

                <input
                  type="text"
                  name="name"
                  className="qv-input"
                  required
                  maxLength={100}
                  placeholder="Full name"
                  autoComplete="name"
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
                  maxLength={255}
                  placeholder="Email address"
                  autoComplete="email"
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
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    title="10-digit mobile number starting with 6, 7, 8, or 9"
                    placeholder="Phone number"
                    autoComplete="tel"
                    value={formData.phonenumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData((previous) => ({
                        ...previous,
                        phonenumber: digitsOnly,
                      }));
                    }}
                  />
                </div>

                <div className="qv-field" style={{ flex: 1 }}>
                  <input
                    type="number"
                    name="age"
                    min="1"
                    max="120"
                    step="1"
                    className="qv-input"
                    required
                    placeholder="Age"
                    value={formData.age}
                    onChange={handleChange}
                    style={{ paddingLeft: "1rem" }}
                  />
                </div>
              </div>

              <div className="qv-field">
                <span className="qv-field-icon">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="qv-input"
                  required
                  minLength={12}
                  maxLength={128}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="qv-field-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((previous) => !previous)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="qv-field">
                <span className="qv-field-icon">🛡️</span>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="qv-input"
                  required
                  minLength={12}
                  maxLength={128}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="qv-field-toggle"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="qv-btn-dark"
              >
                {loading ? "Creating account..." : "Register"}
                <span>➔</span>
              </button>
            </form>

            <p className="qv-footer">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <h2 className="qv-title">Set Up Authenticator</h2>

            <p className="qv-subtitle">
              Scan this QR code using <strong>Google Authenticator</strong>,
              then enter the six-digit code it generates.
            </p>

            {qrCodeUrl && (
              <div className="qv-qr-wrapper">
                <img
                  src={qrCodeUrl}
                  alt="Google Authenticator setup QR code"
                  style={{
                    width: "170px",
                    height: "170px",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </div>
            )}

            {manualSetupKey && (
              <div style={{ margin: "1rem 0", overflowWrap: "anywhere" }}>
                <p>
                  <strong>Can't scan the QR code?</strong>
                </p>
                <p>Enter this setup key manually in Google Authenticator:</p>
                <code>{manualSetupKey}</code>
              </div>
            )}

            {error && (
              <div className="qv-error-alert" role="alert">
                {error}
              </div>
            )}

            <OtpInput
              otp={otp}
              setOtp={setOtp}
              onComplete={handleConfirmTotp}
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => handleConfirmTotp()}
              disabled={loading || otp.join("").length !== 6}
              className="qv-btn-dark"
            >
              {loading ? "Verifying..." : "Activate & Finish"}
              <span>➔</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}