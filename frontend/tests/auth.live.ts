import { test, expect } from "@playwright/test";
test("live four-tab Cognito login, mobile and 4K layout, restoration and logout", async ({
  context,
}) => {
  const roles = ["Citizen", "Driver", "Dispatcher", "Auditor"];
  const pages = [];
  for (const role of roles) {
    const page = await context.newPage();
    pages.push(page);
    page.on("requestfailed", (request) =>
      console.log(
        "Network failure:",
        new URL(request.url()).host,
        request.failure()?.errorText,
      ),
    );
    page.on("pageerror", (error) =>
      console.log("Browser error:", error.message),
    );
    await page.setViewportSize(
      role === "Citizen"
        ? { width: 360, height: 800 }
        : { width: 1440, height: 1000 },
    );
    await page.goto("/");
    await page.getByRole("button", { name: `${role} Demo` }).click();
    await expect(page.locator(".auth-profile-email")).toHaveText(
      `${role.toLowerCase()}@jalsetu.local`,
      { timeout: 30000 },
    );
    try {
      await expect(page.locator(".auth-profile-status")).toContainText(
        "Live AWS Connected",
        { timeout: 30000 },
      );
    } catch (error) {
      console.log(
        "Workspace alert:",
        await page.getByRole("alert").allTextContents(),
      );
      throw error;
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.runtime/auth-live-${role.toLowerCase()}.png`,
      fullPage: true,
    });
  }
  await pages[2].setViewportSize({ width: 3840, height: 2160 });
  expect(
    await pages[2].evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await pages[0].reload();
  await expect(pages[0].locator(".auth-profile-email")).toHaveText(
    "citizen@jalsetu.local",
  );
  for (const page of pages) {
    const revocation = page.waitForResponse(
      (response) =>
        response.url().includes("cognito-idp") &&
        response.request().headers()["x-amz-target"]?.endsWith(".RevokeToken"),
    );
    await page.getByRole("button", { name: "Switch Role / Sign Out" }).click();
    expect((await revocation).ok()).toBe(true);
    await expect(page.getByLabel("Email address")).toBeVisible();
  }
});
