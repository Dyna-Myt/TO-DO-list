import { useId, useState, type FormEvent } from "react";
import {
  AtSign,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import type { BrandConfig, User } from "../types";
import { api, ApiError } from "../lib/api";
import type { Theme } from "../hooks/useTheme";

type AuthMode = "login" | "register";

interface AuthScreenProps {
  brand: BrandConfig;
  theme: Theme;
  onToggleTheme: () => void;
  onAuthenticated: (user: User) => void;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({
  brand,
  theme,
  onToggleTheme,
  onAuthenticated,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameId = useId();
  const emailId = useId();
  const identifierId = useId();
  const passwordId = useId();
  const confirmId = useId();

  function switchMode(nextMode: AuthMode) {
    if (submitting || nextMode === mode) return;

    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanIdentifier = identifier.trim();

    if (mode === "register") {
      if (!cleanUsername) {
        setError("Choose a username.");
        return;
      }
      if (cleanUsername.length < 3) {
        setError("Use at least 3 characters for your username.");
        return;
      }
      if (cleanUsername.length > 24) {
        setError("Keep your username to 24 characters or fewer.");
        return;
      }
      if (!USERNAME_PATTERN.test(cleanUsername)) {
        setError(
          "Usernames can only use letters, numbers, dots, dashes, and underscores.",
        );
        return;
      }
      if (!cleanEmail) {
        setError("Enter your email address.");
        return;
      }
      if (!EMAIL_PATTERN.test(cleanEmail)) {
        setError("Enter a valid email address.");
        return;
      }
    } else if (!cleanIdentifier) {
      setError("Enter your email or username.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }
    if (mode === "register") {
      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const result =
        mode === "login"
          ? await api.login(cleanIdentifier, password)
          : await api.register(cleanUsername, cleanEmail, password);

      onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="auth-shell">
      <div className="auth-topbar">
        <div className="brand" aria-label={brand.name}>
          <span className="brand-mark" aria-hidden="true">
            {brand.logoText}
          </span>
          <span className="brand-name">{brand.name}</span>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </button>
      </div>

      <main className="auth-main">
        <section className="auth-intro" aria-labelledby="auth-heading">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Private tasks, shared teams
          </p>
          <h1 id="auth-heading">
            {brand.tagline.split(" ").slice(0, -1).join(" ")}{" "}
            <em>{brand.tagline.split(" ").slice(-1)}</em>
          </h1>
          <p className="hero-sub">{brand.description}</p>

          <ul className="auth-points">
            <li>
              <ShieldCheck aria-hidden="true" />
              Every account gets private personal tasks and its own history.
            </li>
            <li>
              <Users aria-hidden="true" />
              Create a team to share tasks and monitor progress together.
            </li>
            <li>
              <Lock aria-hidden="true" />
              Passwords are hashed with scrypt before they are stored.
            </li>
            <li>
              <Mail aria-hidden="true" />
              Sessions use a secure HttpOnly cookie on this computer.
            </li>
          </ul>
        </section>

        <section className="auth-card" aria-label="Account access">
          <div className="auth-tabs" role="group" aria-label="Account access">
            <button
              className="auth-tab"
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              className="auth-tab"
              type="button"
              aria-pressed={isRegister}
              onClick={() => switchMode("register")}
            >
              Create account
            </button>
          </div>

          <div className="auth-card-head">
            <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegister
                ? "Pick a username, then keep personal work private or share it with a team."
                : "Sign in with your email or username to open your workspace."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister ? (
              <div className="auth-field">
                <label htmlFor={usernameId}>Username</label>
                <div className="auth-input">
                  <UserRound aria-hidden="true" />
                  <input
                    id={usernameId}
                    type="text"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="e.g. raj_mishra"
                    maxLength={24}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={submitting}
                  />
                </div>
                <p className="auth-hint">
                  Your teammates will see this name on shared tasks.
                </p>
              </div>
            ) : (
              <div className="auth-field">
                <label htmlFor={identifierId}>Email or username</label>
                <div className="auth-input">
                  <AtSign aria-hidden="true" />
                  <input
                    id={identifierId}
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com or username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            )}

            {isRegister ? (
              <div className="auth-field">
                <label htmlFor={emailId}>Email</label>
                <div className="auth-input">
                  <Mail aria-hidden="true" />
                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            ) : null}

            <div className="auth-field">
              <label htmlFor={passwordId}>Password</label>
              <div className="auth-input">
                <Lock aria-hidden="true" />
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {isRegister ? (
              <div className="auth-field">
                <label htmlFor={confirmId}>Confirm password</label>
                <div className="auth-input">
                  <Lock aria-hidden="true" />
                  <input
                    id={confirmId}
                    type={showPassword ? "text" : "password"}
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Type it again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              {isRegister ? (
                <UserPlus aria-hidden="true" />
              ) : (
                <LogIn aria-hidden="true" />
              )}
            </button>
          </form>

          <p className="auth-footnote">
            {isRegister ? "Already have an account? " : "New here? "}
            <button
              className="text-link"
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
              disabled={submitting}
            >
              {isRegister ? "Sign in instead" : "Create an account"}
            </button>
          </p>
        </section>
      </main>

      <p className="auth-storage-note">
        Stored locally in SQLite on this computer. No cloud, no tracking.
      </p>
    </div>
  );
}
