import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Map,
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
export function AuthModal({ notice }: { notice: string }) {
  const [register, setRegister] = useState(false);
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
        <section className="auth-story" aria-label="JAL-SETU water network">
          <a href="#" className="auth-brand">
            <Droplets size={30} /> JAL-SETU
          </a>
          <span className="auth-kicker">NEW DELHI · WATER OPERATIONS</span>
          <h1>
            Every drop. <br />
            Every delivery. <br />
            <span>Connected.</span>
          </h1>
          <p>
            One trusted water network. A dedicated workspace for every person
            who keeps it flowing.
          </p>
          <div className="auth-ripple" aria-hidden="true">
            <Droplets size={76} strokeWidth={1} />
          </div>
          <div className="auth-trust">
            <ShieldCheck size={20} />
            <span>
              Powered by Amazon Cognito
              <br />
              <small>Your role. Your workspace. Your impact.</small>
            </span>
          </div>
        </section>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-lock">
            <LockKeyhole size={23} />
          </div>
          <span className="auth-kicker">THE WATER CONNECTION</span>
          <h2 id="login-title">Welcome to JAL-SETU</h2>
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
              <p className="auth-subtitle">
                Sign in to your municipal workspace.
              </p>
              {!challenge && !reset && (
                <button
                  className="secondary-action mb-3"
                  disabled={!!loading}
                  onClick={() => {
                    setRegister(true);
                    setError("");
                  }}
                >
                  Create account
                </button>
              )}
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
                  placeholder="you@example.com"
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
                <label htmlFor="auth-password">
                  {challenge
                    ? challenge.nameOfChallenge === "NEW_PASSWORD_REQUIRED"
                      ? "New password"
                      : "Verification code"
                    : reset
                      ? "New password"
                      : "Password"}
                </label>
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
                    placeholder="Enter your password"
                    disabled={!!loading}
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                    disabled={!!loading}
                  >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button
                  className="auth-submit"
                  disabled={!!loading}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="auth-spin" size={20} /> Signing
                      in securely…
                    </>
                  ) : (
                    <>
                      {challenge
                        ? "Complete verification"
                        : reset
                          ? "Reset password"
                          : "Sign in to workspace"}{" "}
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>
              </form>
              <button
                className="secondary-action mt-3"
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
              {demoEnabled && !challenge && !reset && (
                <div className="auth-demos">
                  <div className="auth-divider">
                    <span>QUICK DEMO SELECT</span>
                  </div>
                  <p>Choose a persona to sign in instantly.</p>
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
                            <LoaderCircle className="auth-spin" size={20} />
                          ) : (
                            <Icon size={20} />
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
            <CheckCircle2 size={16} /> Your session stays in this tab. Open a
            new tab for another role.
          </p>
          <span className="sr-only" role="status">
            {loading ? "Authenticating with Amazon Cognito" : ""}
          </span>
        </section>
      </div>
    </main>
  );
}
