import type { StakeholderRole } from "../types";
import { setAccessToken, setTokenProvider } from "./api";

const endpoint = "https://cognito-idp.us-east-1.amazonaws.com/";
const clientId = "16ploao82gc7qg4djtua5sdbuh";
const issuer = `${endpoint}us-east-1_ko5ROUcaz`;
export const SESSION_KEY = "jalsetu.auth.v1";
export const rolePortals: Record<string, StakeholderRole> = {
  Citizen: "CITIZEN",
  Driver: "DRIVER",
  Dispatcher: "DISPATCHER",
  Auditor: "PUBLIC_BOARD",
};
export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  email: string;
  subject: string;
  roles: string[];
  expiresAt: number;
}
class AuthError extends Error {
  constructor(
    message: string,
    public terminal = false,
  ) {
    super(message);
  }
}
async function cognito(operation: string, body: object) {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${operation}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AuthError(
      "Unable to reach AWS. Check your connection and try again.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const code = String(data.__type || "")
      .split("#")
      .pop();
    const messages: Record<string, string> = {
      UsernameExistsException:
        "An account already exists for this email. Sign in or verify your email.",
      InvalidPasswordException:
        "Use at least 8 characters with uppercase, lowercase, a number and a symbol.",
      CodeMismatchException:
        "That verification code is incorrect. Please try again.",
      ExpiredCodeException: "That code has expired. Request a new code.",
      LimitExceededException:
        "The email or attempt limit has been reached. Try again later; if you were creating an account, use Verify email to request another code.",
      CodeDeliveryFailureException:
        "AWS could not deliver your email. Check the address and try Verify email to resend the code.",
      UserLambdaValidationException:
        "Registration could not be completed. Check your selected role and try again.",
      InvalidParameterException:
        "Check your email, password and verification code and try again.",
      NotAuthorizedException:
        "Your email or password is incorrect, or your session has expired.",
      UserNotFoundException: "Your email or password is incorrect.",
      UserNotConfirmedException: "Confirm your email before signing in.",
      PasswordResetRequiredException:
        "Your password must be reset. Contact your administrator.",
      TooManyRequestsException:
        "Too many attempts. Please wait a moment and try again.",
    };
    throw new AuthError(
      messages[code!] ||
        "AWS could not complete this request. Please try again.",
      ["NotAuthorizedException", "UserNotFoundException"].includes(code!),
    );
  }
  return data;
}
export type RegistrationRole = "Citizen" | "Driver" | "Dispatcher" | "Auditor";
export async function signUp(
  email: string,
  password: string,
  role: RegistrationRole,
) {
  if (!Object.hasOwn(rolePortals, role))
    throw new Error("Choose a valid role.");
  return cognito("SignUp", {
    ClientId: clientId,
    Username: email.trim(),
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email.trim() },
      { Name: "custom:registration_role", Value: role },
    ],
  });
}
export async function confirmSignUp(email: string, code: string) {
  await cognito("ConfirmSignUp", {
    ClientId: clientId,
    Username: email.trim(),
    ConfirmationCode: code.trim(),
  });
}
export async function resendSignUpCode(email: string) {
  return cognito("ResendConfirmationCode", {
    ClientId: clientId,
    Username: email.trim(),
  });
}
function decode(token: string) {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(part), (c) => c.charCodeAt(0)),
    ),
  );
}
function sessionFromTokens(
  idToken: string,
  accessToken: string,
  refreshToken: string,
): AuthSession {
  try {
    const claims = decode(idToken);
    const access = decode(accessToken);
    const roles = Object.keys(rolePortals).filter(
      (role) =>
        Array.isArray(claims["cognito:groups"]) &&
        claims["cognito:groups"].includes(role),
    );
    if (
      claims.iss !== issuer ||
      claims.aud !== clientId ||
      claims.token_use !== "id" ||
      access.iss !== issuer ||
      access.client_id !== clientId ||
      access.token_use !== "access" ||
      access.sub !== claims.sub ||
      !claims.sub ||
      !claims.email ||
      !roles.length ||
      !Number.isFinite(claims.exp) ||
      !Number.isFinite(access.exp) ||
      !refreshToken
    )
      throw new Error();
    // Claims choose the UI only. API Gateway verifies signatures and enforces authorization.
    return {
      idToken,
      accessToken,
      refreshToken,
      email: claims.email,
      subject: claims.sub,
      roles,
      expiresAt: Math.min(claims.exp, access.exp) * 1000,
    };
  } catch {
    throw new AuthError(
      "This account has no valid JAL-SETU role. Contact your administrator.",
      true,
    );
  }
}
let session: AuthSession | null = null;
let message = "";
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: Promise<string> | null = null;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function clear(reason = "") {
  revision++;
  session = null;
  pending = null;
  message = reason;
  clearTimeout(timer);
  setAccessToken("");
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* unavailable storage */
  }
  emit();
}
function schedule(delay?: number) {
  clearTimeout(timer);
  if (session)
    timer = setTimeout(
      () => {
        void getToken(true).catch(() => {});
      },
      delay ?? Math.max(1000, session.expiresAt - Date.now() - 120000),
    );
}
function commit(next: AuthSession) {
  if (next.expiresAt <= Date.now())
    throw new AuthError(
      "AWS returned an expired session. Please sign in again.",
      true,
    );
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    throw new AuthError("Allow session storage in this browser to sign in.");
  }
  session = next;
  message = "";
  setAccessToken(next.idToken);
  schedule();
  emit();
}
export class SignInChallenge extends Error {
  constructor(
    public nameOfChallenge: string,
    public challengeSession: string,
    public username: string,
  ) {
    super(
      nameOfChallenge === "NEW_PASSWORD_REQUIRED"
        ? "Choose a new password to activate your account."
        : "Enter your verification code.",
    );
  }
}
function finishSignIn(data: any, version: number, username: string) {
  if (data.ChallengeName) {
    if (
      ![
        "NEW_PASSWORD_REQUIRED",
        "SOFTWARE_TOKEN_MFA",
        "SMS_MFA",
        "EMAIL_OTP",
      ].includes(data.ChallengeName)
    )
      throw new AuthError(
        "This account requires administrator-assisted MFA setup.",
      );
    throw new SignInChallenge(
      data.ChallengeName,
      data.Session,
      data.ChallengeParameters?.USER_ID_FOR_SRP || username,
    );
  }
  const result = data.AuthenticationResult;
  const next = sessionFromTokens(
    result?.IdToken,
    result?.AccessToken,
    result?.RefreshToken,
  );
  if (version === revision) commit(next);
}
export async function answerChallenge(
  challenge: SignInChallenge,
  answer: string,
) {
  const version = ++revision;
  const field = (
    {
      NEW_PASSWORD_REQUIRED: "NEW_PASSWORD",
      SOFTWARE_TOKEN_MFA: "SOFTWARE_TOKEN_MFA_CODE",
      SMS_MFA: "SMS_MFA_CODE",
      EMAIL_OTP: "EMAIL_OTP_CODE",
    } as Record<string, string>
  )[challenge.nameOfChallenge];
  const data = await cognito("RespondToAuthChallenge", {
    ClientId: clientId,
    ChallengeName: challenge.nameOfChallenge,
    Session: challenge.challengeSession,
    ChallengeResponses: { USERNAME: challenge.username, [field]: answer },
  });
  finishSignIn(data, version, challenge.username);
}
export async function requestPasswordReset(email: string) {
  await cognito("ForgotPassword", {
    ClientId: clientId,
    Username: email.trim(),
  });
}
export async function confirmPasswordReset(
  email: string,
  code: string,
  password: string,
) {
  await cognito("ConfirmForgotPassword", {
    ClientId: clientId,
    Username: email.trim(),
    ConfirmationCode: code.trim(),
    Password: password,
  });
}
export async function signIn(email: string, password: string) {
  const version = ++revision;
  const data = await cognito("InitiateAuth", {
    ClientId: clientId,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: { USERNAME: email.trim(), PASSWORD: password },
  });
  finishSignIn(data, version, email.trim());
}
export async function signOut() {
  const old = session;
  clear();
  if (old)
    try {
      await cognito("RevokeToken", {
        ClientId: clientId,
        Token: old.refreshToken,
      });
    } catch {
      if (!session) {
        message =
          "Signed out of this tab. AWS session revocation could not be confirmed.";
        emit();
      }
    }
}
export function getToken(force = false): Promise<string> {
  if (!session)
    return Promise.reject(new AuthError("Please sign in to continue.", true));
  if (pending) return pending;
  if (!force && session.expiresAt > Date.now() + 120000)
    return Promise.resolve(session.idToken);
  const previous = session;
  const version = revision;
  const request = (async () => {
    try {
      const data = await cognito("InitiateAuth", {
        ClientId: clientId,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: { REFRESH_TOKEN: previous.refreshToken },
      });
      const result = data.AuthenticationResult;
      const next = sessionFromTokens(
        result?.IdToken,
        result?.AccessToken,
        previous.refreshToken,
      );
      if (next.subject !== previous.subject)
        throw new AuthError(
          "Session identity changed. Please sign in again.",
          true,
        );
      if (version !== revision)
        throw new AuthError("Session changed. Please try again.");
      commit(next);
      return next.idToken;
    } catch (error) {
      if (version === revision) {
        if (error instanceof AuthError && error.terminal)
          clear("Your session has ended. Please sign in again.");
        else {
          message = "Reconnecting to AWS… Check your connection.";
          schedule(15000);
          emit();
        }
      }
      // A brief connection failure must not discard a still-valid session.
      if (
        version === revision &&
        session &&
        previous.expiresAt > Date.now() + 10000
      )
        return previous.idToken;
      throw error;
    } finally {
      if (version === revision) pending = null;
    }
  })();
  pending = request;
  return request;
}
export const auth = {
  getSession: () => session,
  getMessage: () => message,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
try {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    const value = JSON.parse(stored);
    session = sessionFromTokens(
      value.idToken,
      value.accessToken,
      value.refreshToken,
    );
    setAccessToken(session.idToken);
    schedule();
  }
} catch {
  clear("Your saved session could not be restored. Please sign in again.");
}
setTokenProvider(getToken);
const resume = () => {
  if (session) void getToken().catch(() => {});
};
window.addEventListener("online", resume);
window.addEventListener("focus", resume);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resume();
});
