import { test, expect } from "@playwright/test";

test("demo resident code and uploaded photo complete a driver delivery", async ({ page }) => {
  await page.goto("/");
  await page.locator("#nav-tab-citizen").click();
  const otp = (await page.getByText(/^\d{6}$/).textContent())!.trim();
  const photo = await page.screenshot({ type: "jpeg", clip: { x: 0, y: 0, width: 200, height: 120 } });
  await page.locator("#nav-tab-driver").click();
  await page.getByLabel("Resident OTP").fill(otp);
  await page.getByLabel("Liters delivered").fill("2000");
  await page.getByLabel("Delivery evidence photo").setInputFiles({ name: "evidence.jpg", mimeType: "image/jpeg", buffer: photo });
  await page.getByRole("button", { name: "Verify delivery", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Demo delivery recorded locally");
  await expect(page.getByRole("status").locator("code")).toHaveText(/^[a-f0-9]{64}$/);
});
test("desktop workspaces, demo request and copilot", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Every drop.*Every delivery.*Accounted for/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Interactive demo", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/prize pool|students registered|fast-track interviews/i),
  ).toHaveCount(0);
  await page.screenshot({ path: "../.runtime/desktop.png", fullPage: true });
  await page.locator("#nav-tab-citizen").click();
  await expect(
    page.getByRole("button", { name: "Request Emergency Tanker" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request Emergency Tanker" }).click();
  await expect(
    page.getByText("DISPATCHED", { exact: true }).first(),
  ).toBeVisible();
  await page.locator("#nav-tab-driver").click();
  await expect(
    page.getByRole("heading", { name: "Deliver water. Carry trust." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verify delivery", exact: true }),
  ).toBeDisabled();
  await page.locator("#nav-tab-public_board").click();
  await expect(
    page.getByRole("heading", { name: /Water Equity/ }),
  ).toBeVisible();
  await page.locator("#nav-tab-aws_architecture").click();
  await expect(page.getByText("Amazon Bedrock").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile navigation fits and has no horizontal document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Request water", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "../.runtime/mobile.png", fullPage: true });
  await page.locator("#nav-tab-driver").click();
  await expect(page.getByLabel("Resident OTP")).toBeVisible();
  await page.getByRole("button", { name: "हिंदी", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "English", exact: true }),
  ).toBeVisible();
});
