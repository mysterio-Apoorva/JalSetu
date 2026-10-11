import { mockAuth, login } from "./auth-fixture";
import { test, expect } from "@playwright/test";
test.beforeEach(async({page})=>{
  await page.route("**/api/v1/needs",r=>r.fulfill({json:{reports:[],imageGenerationEnabled:false}}));
  await page.route("**/api/v1/planning/config",r=>r.fulfill({json:{origin:null,otpEnabled:false}}));
});
const wards = [
  {
    id: "w1",
    name: "Test ward",
    zone: "South",
    population: 100,
    coordinates: { lat: 28.5, lng: 77.2 },
    deliveredLitersToday: 0,
    activeRequestsCount: 0,
    deficitSeverity: "HIGH",
    groundwaterDepletionScore: 0,
    avgWaitHours: 0,
    giniIndex: 0,
  },
];
test("resident restores owned ticket without re-entering a phone and rotates delivery code", async ({
  page,
}) => {
  const request = {
    id: "owned-ticket",
    wardId: "w1",
    wardName: "Test ward",
    phone: "1234567890",
    status: "DISPATCHED",
    createdAt: new Date().toISOString(),
  };
  await page.route("**/api/v1/snapshot", (route) =>
    route.fulfill({
      json: {
        wards,
        depots: [],
        fleet: [],
        requests: [request],
        anomalies: [],
      },
    }),
  );
  await page.route("**/api/v1/requests/otp", (route) =>
    route.fulfill({ json: { expectedOtp: "987654" } }),
  );
  await mockAuth(page);
  await login(page);
  await expect(page.getByText("owned-ticket", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Generate replacement code" }).click();
  await expect(page.getByText("987654", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rate delivery 1 stars" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Simulate Hindi Voice Note" }),
  ).toBeHidden();
});
test("public board opens without creating an authentication session", async ({
  page,
}) => {
  await page.route("**/api/v1/public", (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: { wards, deliveries: [] } });
  });
  await page.goto("/public");
  await expect(page.getByText("Test ward", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
test("AWS mode submits to API and keeps real errors visible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/snapshot", (route) =>
    route.fulfill({
      json: { wards, depots: [], fleet: [], requests: [], anomalies: [] },
    }),
  );
  const credentials = await mockAuth(page);
  await login(page);
  await page.getByLabel("Requester / RWA Name").fill("Test resident");
  await page.getByLabel("Contact mobile number").fill("9999999999");
  await page.getByLabel("Complaint Details (Hindi / English)").fill("Our building has had no water for three days.");
  let attempt = 0;
  await page.route("**/api/v1/requests", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.idempotencyKey).toBeTruthy();
    expect(route.request().headers().authorization).toBe(
      `Bearer ${credentials.IdToken}`,
    );
    attempt++;
    await route.fulfill(
      attempt === 1
        ? { status: 503, json: { error: "Triage temporarily unavailable" } }
        : {
            json: {
              request: {
                ...body,
                id: "LIVE-REQUEST-1",
                status: "PENDING_TRIAGE",
                expectedOtp: "654321",
                createdAt: new Date().toISOString(),
              },
            },
          },
    );
  });
  await page.getByRole("button", { name: "Request Emergency Tanker" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Triage temporarily unavailable",
  );
  await page.getByRole("button", { name: "Request Emergency Tanker" }).click();
  await expect(page.getByText("LIVE-REQUEST-1", { exact: true })).toBeVisible();
  await expect(page.getByText("654321", { exact: true })).toBeVisible();
  await expect(page.getByText("PENDING_TRIAGE", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(errors).toEqual([]);
});
test("AWS connection failure does not silently show demo fleet", async ({
  page,
}) => {
  await page.route("**/api/v1/snapshot", (route) =>
    route.fulfill({ status: 403, json: { error: "Access denied" } }),
  );
  await mockAuth(page, "Dispatcher");
  await login(page, "Dispatcher");
  await expect(page.getByRole("alert")).toHaveText("Access denied");
  await expect(page.getByText("DL 1GB 4920")).toHaveCount(0);
});
test("auditor AWS transparency loads with identity and exports actual CSV", async ({
  page,
}) => {
  await page.route("**/api/v1/public", (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: { wards, deliveries: [] } });
  });
  await page.route("**/api/v1/snapshot", (route) =>
    route.fulfill({
      json: { wards, depots: [], fleet: [], requests: [], anomalies: [] },
    }),
  );
  await mockAuth(page, "Auditor");
  await login(page, "Auditor");
  await expect(page.getByText("Test ward", { exact: true })).toBeVisible();
  await expect(page.getByText("No verified deliveries yet.")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ward CSV" }).click();
  expect((await download).suggestedFilename()).toBe("jalsetu-water-equity.csv");
});
