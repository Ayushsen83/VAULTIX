import { useState } from "react";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    accountCreatedAt: "",
  });
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formErrors, setFormErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const initials =
    profile.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0].toUpperCase()).join("") || "?";

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function validateProfile() {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Full name is required.";
    else if (formData.name.trim().length > 100) {
      errors.name = "Full name must be 100 characters or fewer.";
    }

    if (!formData.email.trim()) errors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (formData.phoneNumber.trim() &&
        !/^[+()\d\s-]{7,20}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = "Enter a valid phone number.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (!validateProfile()) return;

    // TODO: Persist permitted fields through your authenticated API.
    setProfile({
      ...profile,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phoneNumber: formData.phoneNumber.trim(),
    });
    setIsEditing(false);
    setMessage({
      type: "info",
      text: "Form validated. Connect this handler to your profile API to save changes.",
    });
  }

  function handleCancelEditing() {
    setFormData(profile);
    setFormErrors({});
    setIsEditing(false);
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordData((current) => ({ ...current, [name]: value }));
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Enter your current password.";
    }
    if (passwordData.newPassword.length < 12) {
      errors.newPassword = "New password must contain at least 12 characters.";
    } else if (passwordData.newPassword.length > 128) {
      errors.newPassword = "New password must contain no more than 128 characters.";
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      errors.confirmNewPassword = "Passwords do not match.";
    }
    if (passwordData.currentPassword &&
        passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = "Choose a password different from your current password.";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    // TODO: Send currentPassword and newPassword to the backend over HTTPS.
    setMessage({
      type: "info",
      text: "Password form validated. Connect this handler to your password-change API.",
    });
  }

  function cancelPasswordChange() {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setPasswordErrors({});
    setShowChangePassword(false);
  }

  function handleForgotPassword() {
    // TODO: Navigate to or call your password-reset workflow.
    setMessage({ type: "info", text: "Connect this action to your password-reset workflow." });
  }

  async function handleLogout() {
    // TODO: Call the backend logout endpoint to clear the HttpOnly cookie,
    // clear client-side user state, and navigate to the login page.
    setShowLogoutConfirmation(false);
    setMessage({ type: "info", text: "Connect this action to your backend logout endpoint." });
  }

  return (
    <main>
      <header>
        <h1>Profile</h1>
        <p>Manage your personal information and account security.</p>
      </header>

      {message.text && (
        <div role="status" aria-live="polite" data-message-type={message.type}>
          {message.text}
        </div>
      )}

      <section aria-labelledby="profile-summary-heading">
        <h2 id="profile-summary-heading">Profile information</h2>
        <div>
          <div aria-label="Profile avatar initials">{initials}</div>
          <p>{profile.name || "Your name"}</p>
          <p>{profile.email || "Your registered email"}</p>
        </div>

        {!isEditing ? (
          <>
            <dl>
              <div><dt>Full name</dt><dd>{profile.name || "Not provided"}</dd></div>
              <div><dt>Registered email</dt><dd>{profile.email || "Not provided"}</dd></div>
              <div><dt>Phone number</dt><dd>{profile.phoneNumber || "Not provided"}</dd></div>
              <div><dt>Account created</dt><dd>{profile.accountCreatedAt || "Not available"}</dd></div>
            </dl>
            <button type="button" onClick={() => {
              setFormData(profile);
              setIsEditing(true);
              setMessage({ type: "", text: "" });
            }}>
              Edit profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSaveProfile} noValidate>
            <div>
              <label htmlFor="profile-name">Full name</label>
              <input id="profile-name" name="name" type="text" autoComplete="name"
                value={formData.name} onChange={handleProfileChange} maxLength={100}
                required aria-invalid={Boolean(formErrors.name)} />
              {formErrors.name && <p role="alert">{formErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="profile-email">Email address</label>
              <input id="profile-email" name="email" type="email" autoComplete="email"
                value={formData.email} onChange={handleProfileChange} maxLength={255}
                required aria-invalid={Boolean(formErrors.email)} />
              {formErrors.email && <p role="alert">{formErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="profile-phone">Phone number</label>
              <input id="profile-phone" name="phoneNumber" type="tel" autoComplete="tel"
                value={formData.phoneNumber} onChange={handleProfileChange} maxLength={20}
                aria-invalid={Boolean(formErrors.phoneNumber)} />
              {formErrors.phoneNumber && <p role="alert">{formErrors.phoneNumber}</p>}
            </div>

            <p>Email changes may require a separate verification workflow.</p>
            <button type="submit">Save changes</button>
            <button type="button" onClick={handleCancelEditing}>Cancel</button>
          </form>
        )}
      </section>

      <section aria-labelledby="password-heading">
        <h2 id="password-heading">Password</h2>
        <p>Change your password or start the password recovery process.</p>

        {!showChangePassword ? (
          <button type="button" onClick={() => {
            setShowChangePassword(true);
            setMessage({ type: "", text: "" });
          }}>
            Change password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} noValidate>
            <div>
              <label htmlFor="current-password">Current password</label>
              <input id="current-password" name="currentPassword" type="password"
                autoComplete="current-password" value={passwordData.currentPassword}
                onChange={handlePasswordChange} required
                aria-invalid={Boolean(passwordErrors.currentPassword)} />
              {passwordErrors.currentPassword && <p role="alert">{passwordErrors.currentPassword}</p>}
            </div>

            <div>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" name="newPassword" type="password"
                autoComplete="new-password" value={passwordData.newPassword}
                onChange={handlePasswordChange} minLength={12} maxLength={128} required
                aria-invalid={Boolean(passwordErrors.newPassword)} />
              {passwordErrors.newPassword && <p role="alert">{passwordErrors.newPassword}</p>}
            </div>

            <div>
              <label htmlFor="confirm-new-password">Confirm new password</label>
              <input id="confirm-new-password" name="confirmNewPassword" type="password"
                autoComplete="new-password" value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange} minLength={12} maxLength={128} required
                aria-invalid={Boolean(passwordErrors.confirmNewPassword)} />
              {passwordErrors.confirmNewPassword && <p role="alert">{passwordErrors.confirmNewPassword}</p>}
            </div>

            <button type="submit">Update password</button>
            <button type="button" onClick={cancelPasswordChange}>Cancel</button>
          </form>
        )}

        <button type="button" onClick={handleForgotPassword}>Forgot password?</button>
      </section>

      <section aria-labelledby="security-heading">
        <h2 id="security-heading">Account security</h2>
        <dl>
          <div>
            <dt>Two-factor authentication</dt>
            <dd>Check your account security settings for the current status.</dd>
          </div>
          <div>
            <dt>Session security</dt>
            <dd>Authentication is managed by the server using a secure session cookie.</dd>
          </div>
        </dl>
        {/* TODO: Fetch actual 2FA status and session details from the API. */}
      </section>

      <section aria-labelledby="logout-heading">
        <h2 id="logout-heading">Sign out</h2>
        <p>Sign out of your VAULTIX account on this device.</p>
        <button type="button" onClick={() => setShowLogoutConfirmation(true)}>Logout</button>

        {showLogoutConfirmation && (
          <div role="dialog" aria-modal="true"
            aria-labelledby="logout-confirmation-heading"
            aria-describedby="logout-confirmation-description">
            <h3 id="logout-confirmation-heading">Confirm logout</h3>
            <p id="logout-confirmation-description">Are you sure you want to log out?</p>
            <button type="button" onClick={handleLogout}>Yes, log out</button>
            <button type="button" onClick={() => setShowLogoutConfirmation(false)}>Cancel</button>
          </div>
        )}
      </section>
    </main>
  );
}
