import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  type RegistrationRole,
} from "../../services/auth";

export function RegistrationForm({
  onBack,
}: {
  onBack: (email?: string, message?: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const role: RegistrationRole = "Citizen";
  const [verify, setVerify] = useState(false);
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendAfter, setResendAfter] = useState(0);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="auth-subtitle">
        {verify
          ? "Verify your email to activate your account."
          : "Create your account with your own email and password."}
      </p>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p role="status" className="my-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <form
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (verify) {
              await confirmSignUp(email, code);
              onBack(
                email,
                "Email verified. Your account is ready. Sign in with your password.",
              );
            } else {
              if (password !== repeat)
                throw new Error("Passwords do not match.");
              const result = await signUp(email, password, role);
              setPassword("");
              setRepeat("");
              if (result.UserConfirmed) {
                onBack(email, "Account created. Sign in to your workspace.");
                return;
              }
              setVerify(true);
              setResendAfter(Date.now() + 60000);
              setMessage(
                `Enter the code sent to ${result.CodeDeliveryDetails?.Destination || email}. Check your spam folder too.`,
              );
            }
          });
        }}
      >
        <label htmlFor="register-email">Email address</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy || verify}
          placeholder="you@example.com"
        />
        {verify ? (
          <>
            <label htmlFor="register-code">Email verification code</label>
            <input
              id="register-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <p className="my-4 text-sm">Create a resident account to request water. Driver, dispatcher and auditor access is assigned by your operations administrator.</p>
            <label htmlFor="register-password">Password</label>
            <div className="auth-password">
              <input
                id="register-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                minLength={8}
                maxLength={256}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                aria-describedby="password-help"
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
                disabled={busy}
              >
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p id="password-help" className="text-xs text-slate-500 my-2">
              At least 8 characters, with uppercase, lowercase, a number and a
              symbol.
            </p>
            <label htmlFor="register-repeat">Confirm password</label>
            <input
              id="register-repeat"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              disabled={busy}
            />
          </>
        )}
        <button className="auth-submit" disabled={busy} type="submit">
          {busy ? (
            <>
              <LoaderCircle className="auth-spin" size={20} /> Please wait…
            </>
          ) : verify ? (
            "Verify email"
          ) : (
            "Create account"
          )}
        </button>
      </form>
      <button
        className="secondary-action mt-3"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            if (!email.trim())
              throw new Error("Enter your email address first.");
            if (Date.now() < resendAfter)
              throw new Error(
                "Please wait one minute before requesting another code.",
              );
            await resendSignUpCode(email);
            setVerify(true);
            setPassword("");
            setRepeat("");
            setResendAfter(Date.now() + 60000);
            setMessage("A new verification code has been sent to your email.");
          })
        }
      >
        {verify ? "Resend code" : "Already registered? Verify email"}
      </button>
      <button
        className="secondary-action mt-3"
        disabled={busy}
        onClick={() => onBack(email)}
      >
        Back to sign in
      </button>
    </>
  );
}
