
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/sidebar";
import api, { fetchFreshCsrfToken } from "../services/api";

import "./profile.css";

const INITIAL_PROFILE = {
  userId: null,
  name: "",
  email: "",
  phoneNumber: "",
  age: null,
  createdAt: null,
  emailVerified: null,
};

const INITIAL_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const PASSWORD_FIELDS = [
  {
    name: "currentPassword",
    label: "Current password",
    autocomplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autocomplete: "new-password",
  },
  {
    name: "confirmNewPassword",
    label: "Confirm new password",
    autocomplete: "new-password",
  },
];

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
};

const formatAccountDate = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// The current users controller does not return an email verification field.
// This remains defensive in case the backend adds one later.
const getEmailVerificationStatus = (user) => {
  const fields = [
    "email_verified",
    "emailVerified",
    "is_email_verified",
    "isEmailVerified",
  ];

  const field = fields.find((key) =>
    Object.prototype.hasOwnProperty.call(user, key)
  );

  if (!field) return null;

  const value = user[field];

  if (
    value === true ||
    value === 1 ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === "false" ||
    value === "0"
  ) {
    return false;
  }

  return null;
};

const normalizeUser = (user) => ({
  userId: user.user_id ?? user.id ?? null,
  name: user.name ?? "",
  email: user.email ?? "",
  phoneNumber:
    user.phonenumber ??
    user.phone_number ??
    user.phoneNumber ??
    "",
  age: user.age ?? null,
  createdAt: user.created_at ?? user.createdAt ?? null,
  emailVerified: getEmailVerificationStatus(user),
});

const createFormData = (profile) => ({
  name: profile.name || "",
  phoneNumber: profile.phoneNumber || "",
  age: profile.age == null ? "" : String(profile.age),
});

const getErrorMessage = (error, fallback) => {
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Your request could not be authorized. Please refresh and try again.";
  }

  if (status === 404) {
    return serverMessage || "The requested account information was not found.";
  }

  if (status === 422 || status === 400) {
    return serverMessage || "Please check the information you entered.";
  }

  if (status === 429) {
    return "Too many requests. Please wait before trying again.";
  }

  if (status >= 500) {
    return "The server is temporarily unavailable. Please try again later.";
  }

  return serverMessage || error.message || fallback;
};

export default function Profile() {
  const navigate = useNavigate();

  const personalTabRef = useRef(null);
  const securityTabRef = useRef(null);

  // PROFILE STATE
  const [profile, setProfile] = useState(INITIAL_PROFILE);

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    age: "",
  });

  // PAGE STATE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("personal");

  // PROFILE EDIT STATE
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  // PASSWORD STATE
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordData, setPasswordData] = useState(INITIAL_PASSWORD);
  const [passwordErrors, setPasswordErrors] = useState({});

  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  // DERIVED STATE
  const hasChanges = useMemo(() => {
    return (
      formData.name !== profile.name ||
      formData.phoneNumber !== profile.phoneNumber ||
      formData.age !==
        (profile.age == null ? "" : String(profile.age))
    );
  }, [formData, profile]);

  // FETCH AUTHENTICATED USER PROFILE
  const fetchProfile = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/users/me", { signal });

        const user = response.data?.user;

        if (!response.data?.success || !user) {
          throw new Error("The server returned an invalid profile response.");
        }

        const normalizedProfile = normalizeUser(user);

        setProfile(normalizedProfile);
        setFormData(createFormData(normalizedProfile));

        setIsEditing(false);
        setFieldErrors({});
        setMessage({ type: "", text: "" });
      } catch (requestError) {
        if (
          signal?.aborted ||
          requestError.code === "ERR_CANCELED"
        ) {
          return;
        }

        if (requestError.response?.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        setError(
          getErrorMessage(
            requestError,
            "Unable to load your profile. Please try again."
          )
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchProfile(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProfile]);

  // PROFILE EDITING
  const handleEditProfile = () => {
    if (!profile.userId || loading || saving) return;

    setFormData(createFormData(profile));
    setFieldErrors({});
    setMessage({ type: "", text: "" });
    setIsEditing(true);
    setActiveTab("personal");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setMessage({ type: "", text: "" });
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);

    handleInputChange({
      target: {
        name: "phoneNumber",
        value,
      },
    });
  };

  const validateProfile = () => {
    const errors = {};

    const name = formData.name.trim();
    const phone = formData.phoneNumber.trim();

    if (!name) {
      errors.name = "Full name is required.";
    } else if (name.length > 100) {
      errors.name = "Name cannot exceed 100 characters.";
    } else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(name)) {
      errors.name = "Enter a valid full name.";
    }

    // Optional Indian mobile number: 10 digits beginning with 7, 8 or 9.
    if (phone && !/^[789]\d{9}$/.test(phone)) {
      errors.phoneNumber =
        "Enter a valid 10-digit mobile number starting with 7, 8 or 9.";
    }

    if (formData.age !== "") {
      const age = Number(formData.age);

      if (!Number.isInteger(age) || age < 1 || age > 120) {
        errors.age = "Age must be a whole number between 1 and 120.";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleCancelEdit = () => {
    if (saving) return;

    setFormData(createFormData(profile));
    setFieldErrors({});
    setMessage({ type: "", text: "" });
    setIsEditing(false);
  };

  // SAVE PROFILE
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (saving || !isEditing) return;

    setMessage({ type: "", text: "" });

    if (!validateProfile()) return;

    if (!hasChanges) {
      setIsEditing(false);
      setMessage({
        type: "success",
        text: "Your profile is already up to date.",
      });
      return;
    }

    // Only fields accepted by the supplied users.controller.js.
    const payload = {
      name: formData.name.trim(),
      phonenumber: formData.phoneNumber.trim() || null,
      age: formData.age === "" ? null : Number(formData.age),
    };

    try {
      setSaving(true);

      const csrfToken = await fetchFreshCsrfToken();

      if (!csrfToken) {
        throw new Error(
          "Unable to obtain a security token. Please refresh the page and try again."
        );
      }

      const response = await api.patch("/users/me", payload, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      const updatedUser = response.data?.user;

      if (!response.data?.success || !updatedUser) {
        throw new Error(
          response.data?.message ||
            "The server did not return the updated profile."
        );
      }

      const updatedProfile = normalizeUser(updatedUser);

      setProfile(updatedProfile);
      setFormData(createFormData(updatedProfile));
      setFieldErrors({});
      setIsEditing(false);

      setMessage({
        type: "success",
        text: response.data.message || "Profile updated successfully.",
      });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      setMessage({
        type: "error",
        text: getErrorMessage(
          requestError,
          "Unable to update your profile. Please try again."
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  // PASSWORD FORM
  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setPasswordMessage({ type: "", text: "" });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const resetPasswordForm = () => {
    setPasswordData(INITIAL_PASSWORD);
    setPasswordErrors({});
    setPasswordMessage({ type: "", text: "" });

    setShowPasswords({
      currentPassword: false,
      newPassword: false,
      confirmNewPassword: false,
    });

    setShowPasswordForm(false);
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required.";
    } else if (
      passwordData.newPassword.length < 12 ||
      passwordData.newPassword.length > 128
    ) {
      errors.newPassword = "Password must contain 12–128 characters.";
    }

    if (!passwordData.confirmNewPassword) {
      errors.confirmNewPassword = "Please confirm your new password.";
    } else if (
      passwordData.newPassword !== passwordData.confirmNewPassword
    ) {
      errors.confirmNewPassword = "Passwords do not match.";
    }

    if (
      passwordData.currentPassword &&
      passwordData.newPassword &&
      passwordData.currentPassword === passwordData.newPassword
    ) {
      errors.newPassword =
        "Your new password must differ from your current password.";
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // CHANGE PASSWORD
  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (changingPassword) return;

    setPasswordMessage({ type: "", text: "" });

    if (!validatePasswordForm()) return;

    try {
      setChangingPassword(true);

      const csrfToken = await fetchFreshCsrfToken();

      if (!csrfToken) {
        throw new Error(
          "Unable to obtain a security token. Please refresh the page and try again."
        );
      }

      const response = await api.patch(
        "/users/me/password",
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Password update failed."
        );
      }

      // Backend increments token_version and requires a fresh login.
      const successMessage =
        response.data.message ||
        "Password changed successfully. Please log in again.";

      setPasswordData(INITIAL_PASSWORD);
      setPasswordErrors({});
      setShowPasswordForm(false);

      navigate("/login", {
        replace: true,
        state: {
          message: successMessage,
        },
      });
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      setPasswordMessage({
        type: "error",
        text: getErrorMessage(
          requestError,
          "Unable to change your password. Please try again."
        ),
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // TABS
  const handleTabChange = (tab) => {
    if (saving || changingPassword) return false;

    if (tab !== "personal" && tab !== "security") return false;

    if (activeTab === tab) return true;

    if (isEditing && hasChanges) {
      const discardChanges = window.confirm(
        "You have unsaved changes. Do you want to discard them?"
      );

      if (!discardChanges) return false;
    }

    if (isEditing) {
      setFormData(createFormData(profile));
      setFieldErrors({});
      setMessage({ type: "", text: "" });
      setIsEditing(false);
    }

    if (tab !== "security" && showPasswordForm) {
      resetPasswordForm();
    }

    setActiveTab(tab);
    return true;
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();

    const nextTab = activeTab === "personal" ? "security" : "personal";

    const changed = handleTabChange(nextTab);

    // Move focus only when the tab change was accepted.
    if (!changed) return;

    if (nextTab === "personal") {
      personalTabRef.current?.focus();
    } else {
      securityTabRef.current?.focus();
    }
  };

  // EMAIL VERIFICATION STATUS
  const renderEmailStatus = () => {
    if (profile.emailVerified === true) {
      return (
        <span className="email-status verified">
          <span aria-hidden="true">✓</span>
          Verified
        </span>
      );
    }

    if (profile.emailVerified === false) {
      return (
        <span className="email-status unverified">
          <span aria-hidden="true">!</span>
          Not verified
        </span>
      );
    }

    return (
      <span className="email-status unavailable">
        Status
      </span>
    );
  };

  // PAGE UI
  return (
    <div className="profile-layout">
      <Sidebar />

      <div className="profile-main">
        <main className="profile-content">
          {/* PAGE HEADING */}
          <div className="profile-page-heading">
            <div>
              <span className="profile-eyebrow">
                ACCOUNT MANAGEMENT
              </span>

              <h1>My Profile</h1>

              {/* <p>
                Manage your personal information and keep your
                VAULTIX account secure.
              </p> */}
            </div>
          </div>

          {/* VAULTIX PROFILE BANNER */}
          <section className="profile-hero-banner" aria-label="VAULTIX account overview">
            <div className="profile-hero-copy">
              <span className="profile-hero-kicker">YOUR   IDENTITY</span>
              <h2>Protected Account Space.</h2>
              <p>Manage your personal details and keep your digital vault protected from one place.</p>
              {/* <div className="profile-hero-points">
                <span><i aria-hidden="true">✓</i> Personal details</span>
                <span><i aria-hidden="true">✓</i> Account protection</span>
              </div> */}
            </div>
            <div className="profile-hero-art" aria-hidden="true">
              <div className="profile-hero-orbit profile-hero-orbit-one" />
              <div className="profile-hero-orbit profile-hero-orbit-two" />
              <div className="profile-hero-document">
                <span className="profile-hero-document-line" />
                <span className="profile-hero-document-line short" />
                <span className="profile-hero-document-line" />
                <span className="profile-hero-document-line medium" />
              </div>
              <div className="profile-hero-shield">✓</div>
            </div>
          </section>

          {/* PROFILE HEADER */}
          {!loading && !error && profile.userId && (
            <section
              className="profile-header"
              aria-label="Account summary"
            >
              <div
                className="profile-header-initials"
                aria-label={`Profile initials: ${getInitials(profile.name)}`}
              >
                {getInitials(profile.name)}
              </div>

              <div className="profile-header-info">
                <h2>{profile.name || "User"}</h2>

                <p className="profile-user-email">
                  {profile.email || "Email not available"}
                </p>

                <div className="profile-header-meta">
                  <span className="profile-account-label">
                    <span className="status-dot" aria-hidden="true" />
                    Active account
                  </span>

                  <span className="profile-created-date">
                    Member since {formatAccountDate(profile.createdAt)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="profile-edit-button"
                onClick={handleEditProfile}
                disabled={saving || isEditing}
              >
                <span aria-hidden="true">✎</span>
                {isEditing ? "Editing Profile" : "Edit Profile"}
              </button>
            </section>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div
              className="profile-state"
              role="status"
              aria-live="polite"
            >
              <span className="profile-spinner" aria-hidden="true" />
              Loading your account...
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="profile-error" role="alert">
              <div>
                <strong>Unable to load profile</strong>
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() => fetchProfile()}
                disabled={loading}
              >
                Try Again
              </button>
            </div>
          )}

          {/* PROFILE CONTENT */}
          {!loading && !error && profile.userId && (
            <>
              {/* TAB PANEL */}
              <div className="profile-sections-stack">
                {/* PERSONAL INFORMATION */}
                {true && (
                  <div className="personal-information-section">
                    <div className="section-heading">
                      <div>
                        <span className="section-eyebrow">
                          YOUR ACCOUNT
                        </span>

                        <h2>Personal Information</h2>

                        <p>
                          Your personal details associated with
                          your VAULTIX account.
                        </p>
                      </div>

                      <div
                        className="section-heading-icon"
                        aria-hidden="true"
                      >
                        ♙
                      </div>
                    </div>

                    <form
                      className="personal-information-form"
                      onSubmit={handleSaveProfile}
                      noValidate
                    >
                      <div className="personal-information-grid">
                        {/* FULL NAME */}
                        <div className="personal-information-field">
                          {isEditing ? (
                            <>
                              <label htmlFor="profile-name">
                                Full Name{" "}
                                <span className="required-mark">*</span>
                              </label>

                              <input
                                id="profile-name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleInputChange}
                                maxLength={100}
                                autoComplete="name"
                                placeholder="Enter your full name"
                                disabled={saving}
                                aria-invalid={Boolean(fieldErrors.name)}
                                aria-describedby={
                                  fieldErrors.name
                                    ? "name-error"
                                    : undefined
                                }
                              />

                              {fieldErrors.name && (
                                <span
                                  id="name-error"
                                  className="profile-field-error"
                                  role="alert"
                                >
                                  {fieldErrors.name}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="profile-field-label">
                                Full Name
                              </div>

                              <div className="profile-readonly-value">
                                {profile.name || "Not provided"}
                              </div>
                            </>
                          )}
                        </div>

                        {/* EMAIL ADDRESS */}
                        <div className="personal-information-field">
                          <label htmlFor="profile-email">
                            Email Address
                          </label>

                          <input
                            id="profile-email"
                            type="email"
                            value={profile.email}
                            readOnly
                            aria-readonly="true"
                            className="profile-email-readonly"
                          />

                          <span className="profile-readonly-hint">
                            Your registered email cannot be changed here.
                          </span>
                        </div>

                        {/* PHONE NUMBER */}
                        <div className="personal-information-field">
                          {isEditing ? (
                            <>
                              <label htmlFor="profile-phone">
                                Phone Number
                              </label>

                              <input
                                id="profile-phone"
                                name="phoneNumber"
                                type="tel"
                                inputMode="numeric"
                                pattern="[789][0-9]{9}"
                                value={formData.phoneNumber}
                                onChange={handlePhoneChange}
                                maxLength={10}
                                autoComplete="tel"
                                placeholder="Enter 10-digit mobile number"
                                disabled={saving}
                                aria-invalid={Boolean(
                                  fieldErrors.phoneNumber
                                )}
                                aria-describedby={
                                  fieldErrors.phoneNumber
                                    ? "phone-error"
                                    : undefined
                                }
                              />

                              {fieldErrors.phoneNumber && (
                                <span
                                  id="phone-error"
                                  className="profile-field-error"
                                  role="alert"
                                >
                                  {fieldErrors.phoneNumber}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="profile-field-label">
                                Phone Number
                              </div>

                              <div className="profile-readonly-value">
                                {profile.phoneNumber || "Not provided"}
                              </div>
                            </>
                          )}
                        </div>

                        {/* AGE */}
                        <div className="personal-information-field">
                          {isEditing ? (
                            <>
                              <label htmlFor="profile-age">
                                Age
                              </label>

                              <input
                                id="profile-age"
                                name="age"
                                type="number"
                                min="1"
                                max="120"
                                step="1"
                                value={formData.age}
                                onChange={handleInputChange}
                                placeholder="Enter age"
                                disabled={saving}
                                aria-invalid={Boolean(fieldErrors.age)}
                                aria-describedby={
                                  fieldErrors.age
                                    ? "age-error"
                                    : undefined
                                }
                              />

                              {fieldErrors.age && (
                                <span
                                  id="age-error"
                                  className="profile-field-error"
                                  role="alert"
                                >
                                  {fieldErrors.age}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="profile-field-label">
                                Age
                              </div>

                              <div className="profile-readonly-value">
                                {profile.age != null
                                  ? `${profile.age} years`
                                  : "Not provided"}
                              </div>
                            </>
                          )}
                        </div>

                        {/* ACCOUNT CREATED */}
                        <div className="personal-information-field">
                          <div className="profile-field-label">
                            Account Created
                          </div>

                          <div className="profile-readonly-value">
                            {formatAccountDate(profile.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* PROFILE FEEDBACK */}
                      {message.text && (
                        <div
                          className={`profile-feedback ${message.type}`}
                          role={
                            message.type === "error" ? "alert" : "status"
                          }
                          aria-live="polite"
                        >
                          {message.text}
                        </div>
                      )}

                      {/* EDIT ACTIONS */}
                      {isEditing && (
                        <div className="profile-form-actions">
                          <button
                            type="button"
                            className="profile-cancel-button"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="profile-save-button"
                            disabled={saving || !hasChanges}
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {/* ACCOUNT SECURITY */}
                {true && (
                  <div className="account-security-section">
                    <div className="section-heading">
                      <div>
                        <span className="section-eyebrow">
                          PROTECT YOUR ACCOUNT
                        </span>

                        <h2>Account Security</h2>

                        <p>
                          Manage your password and check your email
                          verification status.
                        </p>
                      </div>

                      <div
                        className="section-heading-icon"
                        aria-hidden="true"
                      >
                        ◈
                      </div>
                    </div>

                    {/* PASSWORD MANAGEMENT */}
                    <div className="security-group-label">
                      PASSWORD MANAGEMENT
                    </div>

                    <div className="security-option-card">
                      <div className="security-option-icon password-icon">
                        <span aria-hidden="true">⌑</span>
                      </div>

                      <div className="security-option-details">
                        <h3>Change Password</h3>

                        <p>
                          Update your password to help keep your
                          account protected.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="security-option-action"
                        onClick={() => {
                          if (showPasswordForm) {
                            resetPasswordForm();
                          } else {
                            setShowPasswordForm(true);
                            setPasswordErrors({});
                            setPasswordMessage({ type: "", text: "" });
                          }
                        }}
                        disabled={changingPassword}
                        aria-expanded={showPasswordForm}
                        aria-controls="change-password-form"
                      >
                        {showPasswordForm ? "Close" : "Change"}
                        <span aria-hidden="true">
                          {showPasswordForm ? "−" : "+"}
                        </span>
                      </button>
                    </div>

                    {/* CHANGE PASSWORD FORM */}
                    {showPasswordForm && (
                      <form
                        id="change-password-form"
                        className="change-password-form"
                        onSubmit={handleChangePassword}
                        noValidate
                      >
                        <div className="change-password-heading">
                          <h3>Update Your Password</h3>

                          <p>
                            Enter your current password and choose
                            a strong new password.
                          </p>
                        </div>

                        {PASSWORD_FIELDS.map((field) => (
                          <div
                            className="password-field"
                            key={field.name}
                          >
                            <label htmlFor={field.name}>
                              {field.label}
                            </label>

                            <div className="password-input-wrapper">
                              <input
                                id={field.name}
                                name={field.name}
                                type={
                                  showPasswords[field.name]
                                    ? "text"
                                    : "password"
                                }
                                value={passwordData[field.name]}
                                onChange={handlePasswordChange}
                                autoComplete={field.autocomplete}
                                maxLength={128}
                                minLength={
                                  field.name === "newPassword" ? 12 : undefined
                                }
                                disabled={changingPassword}
                                aria-invalid={Boolean(
                                  passwordErrors[field.name]
                                )}
                                aria-describedby={
                                  passwordErrors[field.name]
                                    ? `${field.name}-error`
                                    : field.name === "newPassword"
                                      ? "password-requirements"
                                      : undefined
                                }
                              />

                              <button
                                type="button"
                                className="password-visibility-button"
                                onClick={() =>
                                  togglePasswordVisibility(field.name)
                                }
                                disabled={changingPassword}
                                aria-label={
                                  showPasswords[field.name]
                                    ? `Hide ${field.label}`
                                    : `Show ${field.label}`
                                }
                              >
                                {showPasswords[field.name] ? "Hide" : "Show"}
                              </button>
                            </div>

                            {field.name === "newPassword" && (
                              <span
                                id="password-requirements"
                                className="password-requirements"
                              >
                                Use 12–128 characters.
                              </span>
                            )}

                            {passwordErrors[field.name] && (
                              <span
                                id={`${field.name}-error`}
                                className="password-field-error"
                                role="alert"
                              >
                                {passwordErrors[field.name]}
                              </span>
                            )}
                          </div>
                        ))}

                        {passwordMessage.text && (
                          <div
                            className={`password-feedback ${passwordMessage.type}`}
                            role={
                              passwordMessage.type === "error"
                                ? "alert"
                                : "status"
                            }
                            aria-live="polite"
                          >
                            {passwordMessage.text}
                          </div>
                        )}

                        <div className="password-form-actions">
                          <button
                            type="button"
                            className="password-cancel-button"
                            onClick={resetPasswordForm}
                            disabled={changingPassword}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="password-submit-button"
                            disabled={changingPassword}
                          >
                            {changingPassword
                              ? "Updating Password..."
                              : "Update Password"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* EMAIL SECURITY */}
                    <div className="security-group-label email-group-label">
                      EMAIL SECURITY
                    </div>

                    <div className="security-option-card email-security-card">
                      <div className="security-option-icon email-icon">
                        <span aria-hidden="true">✉</span>
                      </div>

                      <div className="security-option-details">
                        <h3>Email Verification</h3>

                        <p>
                           Check Your VAULTIX Account E-Mail Verification Status
                        </p>

                        <div className="security-email-address">
                          {profile.email || "Email not available"}
                        </div>
                      </div>

                      <div className="email-verification-row">
                        {renderEmailStatus()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
