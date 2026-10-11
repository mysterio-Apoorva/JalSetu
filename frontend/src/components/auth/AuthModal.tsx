import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Map,
  Moon,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import {
  signIn,
  SignInChallenge,
  answerChallenge,
  requestPasswordReset,
  confirmPasswordReset,
} from "../../services/auth";
import "./auth.css";
import { RegistrationForm } from "./RegistrationForm";

const personas = [
  {
    role: "Citizen",
    icon: Users,
    description: "Request water for your community",
  },
  {
    role: "Driver",
    icon: Truck,
    description: "Deliver with verified handshakes",
  },
  {
    role: "Dispatcher",
    icon: Map,
    description: "Coordinate the water network",
  },
  {
    role: "Auditor",
    icon: ShieldCheck,
    description: "Follow every verified drop",
  },
];

const demoEnabled =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";

export function AuthModal({
  notice,
  initialTab = "login",
  onBackToLanding,
}: {
  notice: string;
  initialTab?: "login" | "register";
  onBackToLanding?: () => void;
}) {
  const [register, setRegister] = useState(initialTab === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<SignInChallenge | null>(null);
  const [reset, setReset] = useState(false);
  const [code, setCode] = useState("");

  async function submit(
    username = email,
    secret = password,
    persona = "account",
  ) {
    if (loading) return;
    setError("");
    setLoading(persona);
    try {
      if (challenge) await answerChallenge(challenge, secret);
      else if (reset) {
        await confirmPasswordReset(username, code, secret);
        setReset(false);
        setPassword("");
        setError("Password updated. Sign in with your new password.");
      } else await signIn(username, secret);
    } catch (e) {
      if (e instanceof SignInChallenge) {
        setChallenge(e);
        setPassword("");
      }
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="auth-screen">
      <a className="secondary-action" href="/public">
        Public transparency board
      </a>

      <div className="auth-shell">
        {/* ─────────────────────────────────────────────────────────────
            LEFT COLUMN: BENTO GRID MOSAIC (Ref: Image 5)
        ───────────────────────────────────────────────────────────── */}
        <section className="auth-bento-section" aria-label="JAL-SETU water network">
          <div className="auth-bento-grid">
            {/* Card 1: Top-Left Monitoring Workstation Image */}
            <div className="bento-card bento-image-card">
              <img
                src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80"
                alt="Water dispatch telemetry workstation"
                className="bento-img"
                loading="lazy"
              />
              <div className="bento-image-overlay" />
            </div>

            {/* Card 2: Top-Right Vivid Orange Stat Card */}
            <div className="bento-card bento-stat-card bento-orange">
              <div className="stat-number">41%</div>
              <p className="stat-caption">
                of municipal wards face acute water pressure during summer heatwaves.
              </p>
            </div>

            {/* Card 3: Mid-Left Technical Plant & Valve Sensor Image */}
            <div className="bento-card bento-image-card">
              <img
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80"
                alt="Hydraulic flow sensor and pressure testing"
                className="bento-img"
                loading="lazy"
              />
              <div className="bento-image-overlay" />
            </div>

            {/* Card 4: Mid-Right Control Room Display Wall Image */}
            <div className="bento-card bento-image-card">
              <img
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80"
                alt="Operations command wall tracking fleet dispatches"
                className="bento-img"
                loading="lazy"
              />
              <div className="bento-image-overlay" />
            </div>

            {/* Card 5: Bottom-Left Vivid Green Stat Card */}
            <div className="bento-card bento-stat-card bento-green">
              <div className="stat-number">76%</div>
              <p className="stat-caption">
                reduction in ghost trips and water diversion via cryptographic 3-way OTP verification.
              </p>
            </div>

            {/* Card 6: Bottom-Right Field Engineering Laptop Image */}
            <div className="bento-card bento-image-card">
              <img
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80"
                alt="Field telemetry and GPS validation maps"
                className="bento-img"
                loading="lazy"
              />
              <div className="bento-image-overlay" />
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT COLUMN: SLEEK AUTHENTICATION CARD (Ref: Image 5)
        ───────────────────────────────────────────────────────────── */}
        <section className="auth-card" aria-labelledby="login-title">
          {onBackToLanding && (
            <div className="mb-2">
              <button
                type="button"
                className="secondary-action text-xs"
                style={{ padding: "6px 14px", minHeight: "48px" }}
                onClick={onBackToLanding}
              >
                ← Back to Landing Page
              </button>
            </div>
          )}
          {/* Top Row: Switch between Sign In / Sign Up & Theme Indicator */}
          <div className="auth-top-row">
            <span className="auth-toggle-link">
              {register ? "Already have an account?" : "Don't have an account?"}
            </span>
            {register ? (
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setRegister(false);
                  setError("");
                }}
              >
                Back to sign in
              </button>
            ) : (
              !challenge &&
              !reset && (
                <button
                  type="button"
                  className="secondary-action"
                  disabled={!!loading}
                  onClick={() => {
                    setRegister(true);
                    setError("");
                  }}
                >
                  Create account
                </button>
              )
            )}
            <div className="theme-pill" title="System theme">
              <Moon size={15} />
            </div>
          </div>

          <div className="auth-header-block">
            <h2 id="login-title" className="auth-title">
              {register ? (
                <>
                  Create an account on <span className="brand-accent">Jal-Setu</span>
                </>
              ) : (
                <>
                  Sign in to <span className="brand-accent">Jal-Setu</span>
                </>
              )}
            </h2>
            <p className="auth-subtitle">
              Welcome to Jal-Setu, please enter your login details below to access the water network.
            </p>
          </div>

          {register ? (
            <RegistrationForm
              onBack={(address, message) => {
                setRegister(false);
                setEmail(address || "");
                setPassword("");
                setError(message || "");
              }}
            />
          ) : (
            <>
              {(error || notice) && (
                <div role="alert" className="auth-error">
                  {error || notice}
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
                aria-busy={!!loading}
              >
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin123@gmail.com"
                  disabled={!!loading || !!challenge || reset}
                />

                {reset && (
                  <>
                    <label htmlFor="auth-code">Email recovery code</label>
                    <input
                      id="auth-code"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </>
                )}

                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="mb-0">
                    {challenge
                      ? challenge.nameOfChallenge === "NEW_PASSWORD_REQUIRED"
                        ? "New password"
                        : "Verification code"
                      : reset
                        ? "New password"
                        : "Password"}
                  </label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    disabled={!!loading}
                    onClick={async () => {
                      if (reset || challenge) {
                        setReset(false);
                        setChallenge(null);
                        setPassword("");
                        setError("");
                        return;
                      }
                      if (!email.trim()) {
                        setError("Enter your email address first.");
                        return;
                      }
                      setLoading("recovery");
                      try {
                        await requestPasswordReset(email);
                        setReset(true);
                        setPassword("");
                        setError(
                          "If your account can receive recovery emails, a code has been sent.",
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setLoading("");
                      }
                    }}
                  >
                    {reset || challenge ? "Back to sign in" : "Forgot password?"}
                  </button>
                </div>

                <div className="auth-password">
                  <input
                    id="auth-password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    disabled={!!loading}
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                    disabled={!!loading}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  className="auth-submit"
                  disabled={!!loading}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="auth-spin" size={18} /> Signing
                      in securely…
                    </>
                  ) : (
                    <>
                      {challenge
                        ? "Complete verification"
                        : reset
                          ? "Reset password"
                          : "Sign in to workspace"}
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="auth-divider">
                <span>OR</span>
              </div>

              {/* Sign in with Google / SSO */}
              <button
                type="button"
                className="auth-sso-btn"
                disabled={!!loading}
                onClick={() => {
                  setError("Amazon Cognito Single Sign-On ready. Select a persona below to sign in.");
                }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Fast Track Hackathon / Demo Personas */}
              {demoEnabled && !challenge && !reset && (
                <div className="auth-demos">
                  <div className="auth-divider">
                    <span>QUICK DEMO SELECT</span>
                  </div>
                  <div className="auth-personas">
                    {personas.map(({ role, icon: Icon, description }) => (
                      <button
                        key={role}
                        className={`auth-persona persona-${role.toLowerCase()}`}
                        disabled={!!loading}
                        onClick={() => {
                          const username = `${role.toLowerCase()}@jalsetu.local`;
                          const secret = `${role}Pass123!`;
                          setEmail(username);
                          setPassword(secret);
                          void submit(username, secret, role);
                        }}
                      >
                        <span>
                          {loading === role ? (
                            <LoaderCircle className="auth-spin" size={16} />
                          ) : (
                            <Icon size={16} />
                          )}
                          <strong>{role} Demo</strong>
                        </span>
                        <small>{description}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="auth-footnote">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Your session stays in this tab. Open a new tab for another role.</span>
          </p>

          <span className="sr-only" role="status">
            {loading ? "Authenticating with Amazon Cognito" : ""}
          </span>
        </section>
      </div>
    </main>
  );
}
export default AuthModal;
