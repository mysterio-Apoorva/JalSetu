import { test, expect } from "@playwright/test";
import { login, mockAuth, tokens } from "./auth-fixture";
const snapshot = {
  wards: [],
  depots: [],
  fleet: [],
  requests: [],
  anomalies: [],
};
test("self-registration verifies email, limits resends, and signs in", async ({
  page,
}) => {
  const operations: string[] = [];
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    const op = route.request().headers()["x-amz-target"].split(".").pop()!;
    const body = route.request().postDataJSON();
    operations.push(op);
    if (op === "SignUp") {
      expect(body.UserAttributes).toContainEqual({
        Name: "custom:registration_role",
        Value: "Citizen",
      });
      expect(body.Password).toBe("MyOwnPassword123!");
      return route.fulfill({
        json: {
          UserConfirmed: false,
          CodeDeliveryDetails: { Destination: "u***@example.org" },
        },
      });
    }
    if (op === "ConfirmSignUp") {
      expect(body.ConfirmationCode).toBe("123456");
      return route.fulfill({ json: {} });
    }
    if (op === "InitiateAuth")
      return route.fulfill({
        json: { AuthenticationResult: tokens("Citizen") },
      });
    return route.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#signin");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    360,
  );
  for (const control of await page
    .locator(".auth-card button, .auth-card input")
    .all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  }
  await page.screenshot({
    path: "../.runtime/registration-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("user@example.org");
  await expect(page.getByRole("button", { name: "Dispatcher", exact: true })).toHaveCount(0);
  await page.getByLabel("Password", { exact: true }).fill("MyOwnPassword123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Mismatch123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");
  expect(operations).toEqual([]);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("MyOwnPassword123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByLabel("Email verification code")).toBeVisible();
  await page.getByRole("button", { name: "Resend code", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("wait one minute");
  await page.getByLabel("Email verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Email verified");
  await page.getByLabel("Password", { exact: true }).fill("MyOwnPassword123!");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Sign out" }),
  ).toBeVisible();
  expect(operations).toEqual(["SignUp", "ConfirmSignUp", "InitiateAuth"]);
});

test("returning unconfirmed account can resend and correct a verification code", async ({
  page,
}) => {
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    if (route.request().headers()["x-amz-target"].endsWith("ConfirmSignUp"))
      return route.fulfill({
        status: 400,
        json: { __type: "CodeMismatchException" },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto("/#signin");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email address").fill("user@example.org");
  await page
    .getByRole("button", { name: "Already registered? Verify email" })
    .click();
  await page.getByLabel("Email verification code").fill("000000");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await expect(page.getByLabel("Email verification code")).toBeEnabled();
});
test("invited user completes the Cognito new-password challenge", async ({
  page,
}) => {
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    const target = route.request().headers()["x-amz-target"];
    if (target.endsWith("RespondToAuthChallenge")) {
      const body = route.request().postDataJSON();
      expect(body.Session).toBe("challenge-session");
      expect(body.ChallengeResponses.NEW_PASSWORD).toBe("StrongerPassword123!");
      return route.fulfill({ json: { AuthenticationResult: tokens() } });
    }
    return route.fulfill({
      json: {
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: "challenge-session",
      },
    });
  });
  await login(page);
  await page
    .getByLabel("New password", { exact: true })
    .fill("StrongerPassword123!");
  await page.getByRole("button", { name: "Complete verification" }).click();
  await expect(
    page.getByRole("button", { name: "Sign out" }),
  ).toBeVisible();
});
test("password recovery calls Cognito and returns to sign in", async ({
  page,
}) => {
  const operations: string[] = [];
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    operations.push(
      route.request().headers()["x-amz-target"].split(".").pop()!,
    );
    return route.fulfill({ json: {} });
  });
  await page.goto("/#signin");
  await page.getByLabel("Email address").fill("resident@example.org");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email recovery code").fill("123456");
  await page
    .getByLabel("New password", { exact: true })
    .fill("StrongerPassword123!");
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Password updated");
  expect(operations).toEqual(["ForgotPassword", "ConfirmForgotPassword"]);
});
test.beforeEach(async ({ context }) => {
  await context.route("**/api/v1/**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/needs") ? {reports:[],imageGenerationEnabled:false} : route.request().url().endsWith("/public")
        ? { wards: [], deliveries: [] }
        : snapshot,
    }),
  );
});
test("four personas stay isolated across tabs, restore, and sign out independently", async ({
  context,
}) => {
  const roles = ["Citizen", "Driver", "Dispatcher", "Auditor"];
  const tabs = await Promise.all(
    roles.map(async (role) => {
      const page = await context.newPage();
      await mockAuth(page, role);
      await login(page, role);
      await expect(page.locator(".auth-profile-email")).toHaveText(
        `${role.toLowerCase()}@jalsetu.local`,
      );
      await expect(page.locator(".role-tab")).toHaveCount(role === "Auditor" ? 4 : 5);
      for (const other of roles.filter(value => value !== role && value !== "Auditor")) {
        await expect(page.locator(`#nav-tab-${other === "Citizen" ? "citizen" : other === "Driver" ? "driver" : "dispatcher"}`)).toHaveCount(0);
      }
      await expect(page.locator(".role-tab.selected")).toHaveCount(1);
      await page.reload();
      await expect(page.locator(".auth-profile-email")).toHaveText(
        `${role.toLowerCase()}@jalsetu.local`,
      );
      expect(await page.evaluate(() => localStorage.length)).toBe(0);
      return page;
    }),
  );
  await tabs[0].getByRole("button", { name: "Sign out" }).click();
  await expect(tabs[0].getByLabel("Email address")).toBeVisible();
  expect(await tabs[0].evaluate(() => sessionStorage.length)).toBe(0);
  for (let i = 1; i < tabs.length; i++)
    await expect(tabs[i].locator(".auth-profile-email")).toHaveText(
      `${roles[i].toLowerCase()}@jalsetu.local`,
    );
});
test("refresh replaces ID token, preserves refresh token, and expired sessions return to login", async ({
  page,
}) => {
  let refreshes = 0;
  let reject = false;
  const initial = tokens("Citizen", 121);
  const renewed = tokens("Citizen");
  await page.clock.install();
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    const body = route.request().postDataJSON();
    if (body.AuthFlow === "REFRESH_TOKEN_AUTH") {
      refreshes++;
      expect(body.AuthParameters.REFRESH_TOKEN).toBe(initial.RefreshToken);
      if (reject)
        return route.fulfill({
          status: 400,
          json: { __type: "NotAuthorizedException" },
        });
      return route.fulfill({
        json: {
          AuthenticationResult: {
            IdToken: renewed.IdToken,
            AccessToken: renewed.AccessToken,
          },
        },
      });
    }
    return route.fulfill({ json: { AuthenticationResult: initial } });
  });
  await login(page);
  await expect(page.locator(".auth-profile-email")).toBeVisible();
  await page.clock.fastForward(2000);
  await expect.poll(() => refreshes).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(sessionStorage.getItem("jalsetu.auth.v1")!).idToken,
      ),
    )
    .toBe(renewed.IdToken);
  reject = true;
  await page.clock.fastForward(3600000);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("session has ended");
});
test("mobile login has touch targets, password toggle, errors and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) =>
    route.fulfill({ status: 400, json: { __type: "NotAuthorizedException" } }),
  );
  await page.goto("/#signin");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  for (const control of await page
    .locator(".auth-card button, .auth-card input")
    .all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    360,
  );
  await page.screenshot({
    path: "../.runtime/auth-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Citizen Demo" }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Hide password" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../.runtime/auth-desktop.png",
    fullPage: true,
  });
});
test("a delayed refresh cannot resurrect a signed-out session", async ({
  page,
}) => {
  let release: () => void = () => {};
  let started = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.clock.install();
  await page.route(
    "https://cognito-idp.us-east-1.amazonaws.com/",
    async (route) => {
      if (route.request().postDataJSON().AuthFlow === "REFRESH_TOKEN_AUTH") {
        started = true;
        await gate;
        return route.fulfill({ json: { AuthenticationResult: tokens() } });
      }
      return route.fulfill({
        json: { AuthenticationResult: tokens("Citizen", 121) },
      });
    },
  );
  await login(page);
  await expect(page.locator(".auth-profile-email")).toBeVisible();
  await page.clock.fastForward(2000);
  await expect.poll(() => started).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  release();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("refresh network failure preserves session and retries on reconnect", async ({
  page,
}) => {
  let offline = true;
  let refreshes = 0;
  await page.clock.install();
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) => {
    if (route.request().postDataJSON().AuthFlow === "REFRESH_TOKEN_AUTH") {
      refreshes++;
      if (offline) return route.abort();
      return route.fulfill({ json: { AuthenticationResult: tokens() } });
    }
    return route.fulfill({
      json: { AuthenticationResult: tokens("Citizen", 121) },
    });
  });
  await login(page);
  await expect(page.locator(".auth-profile-email")).toBeVisible();
  await page.clock.fastForward(2000);
  await expect(
    page.getByText("Reconnecting to AWS… Check your connection."),
  ).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(1);
  offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => refreshes).toBe(2);
  await expect(page.locator(".auth-profile-status")).toContainText(
    "Live AWS Connected",
  );
});
test("network failures and unassigned groups fail safely", async ({ page }) => {
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) =>
    route.abort(),
  );
  await login(page);
  await expect(page.getByRole("alert")).toContainText("Check your connection");
  await page.unroute("https://cognito-idp.us-east-1.amazonaws.com/");
  await mockAuth(page, "Unknown");
  await page.getByRole("button", { name: "Citizen Demo" }).click();
  await expect(page.getByRole("alert")).toContainText("no valid JAL-SETU role");
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
