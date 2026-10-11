import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './auth-fixture';

const empty = { wards: [], depots: [], fleet: [], requests: [], anomalies: [] };
const ward = { id: 'layout-ward', name: 'South Delhi community water collection point', zone: 'South', population: 1200, coordinates: { lat: 28.6, lng: 77.2 }, deliveredLitersToday: 2000, activeRequestsCount: 1, deficitSeverity: 'HIGH', groundwaterDepletionScore: 0, avgWaitHours: 2, giniIndex: 0 };
const request = { id: 'layout-request', wardId: ward.id, wardName: ward.name, status: 'DISPATCHED', householdCount: 12, vulnerableCount: 3, complaintText: 'Our collection point has been without water for several days.', urgencyScore: 70, demandLiters: 2000, createdAt: new Date().toISOString(), phone: '9999999999' };
const tanker = { id: 'layout-tanker', vehicleNumber: 'DL 01 AB 1234', driverName: 'Assigned community delivery driver', driverPhone: '', depotName: 'South Delhi distribution centre', status: 'EN_ROUTE', assignedRoute: [{ requestId: request.id, stopIndex: 1, coordinates: ward.coordinates, wardName: ward.name, demandLiters: 2000, etaMinutes: 5, isCompleted: false, urgencyTier: 'HIGH_PRIORITY' }], currentCoordinates: ward.coordinates, capacityLiters: 10000, currentWaterLevelLiters: 5000, speedKmph: 0 };

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('https://cdn.21st.dev/**', r => r.abort());
  await page.route('**/api/v1/public', r => r.fulfill({ json: { wards: [], deliveries: [], anomalyCount: 0 } }));
  await page.route('**/api/v1/needs', r => r.fulfill({ json: { reports: [], own: null, imageGenerationEnabled: false } }));
  await page.route('**/api/v1/planning/config', r => r.fulfill({ json: { origin: null, otpEnabled: false } }));
});

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

for (const width of [360, 768, 1024, 1440]) {
  test(`landing flow has no overlapping cards or clipped copy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.brand')).toContainText('jalSetu');
    await expect(page.locator('.brand-dash')).toHaveCount(0);
    await expect(page.locator('.skyline-empty')).toBeVisible();
    await fits(page);
    const failures = await page.locator('.workflow-step, .community-card, .proof-card, .workspace-link-card').evaluateAll(cards => {
      const problems: string[] = [];
      for (const card of cards) {
        const box = card.getBoundingClientRect();
        for (const text of card.querySelectorAll('h3, p')) {
          const rect = text.getBoundingClientRect();
          if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.bottom > box.bottom + 1) problems.push(text.textContent || 'clipped');
        }
        const title = card.querySelector('h3')!.getBoundingClientRect();
        const copy = card.querySelector('p')!.getBoundingClientRect();
        if (title.bottom > copy.top) problems.push('overlapping title and copy');
      }
      return problems;
    });
    expect(failures).toEqual([]);
    await page.screenshot({ path: `../.runtime/layout-landing-${width}.png`, fullPage: true });
  });
}

for (const role of ['Citizen', 'Dispatcher', 'Driver', 'Auditor']) {
  for (const width of [360, 1440]) {
    test(`${role} dashboard fits ${width}px with populated records`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewportSize({ width, height: 1000 });
      await mockAuth(page, role);
      if (role === 'Auditor') await page.route('**/api/v1/public', r => r.fulfill({ json: { wards: [ward], deliveries: [], anomalyCount: 0 } }));
      await page.route('**/api/v1/snapshot', r => r.fulfill({ json: { ...empty, wards: [ward], requests: [request], fleet: [tanker] } }));
      await page.goto('/#signin');
      await page.getByLabel('Email address').fill('layout@example.org');
      await page.getByLabel('Password', { exact: true }).fill('LayoutTest123!');
      await page.getByRole('button', { name: 'Sign in to workspace' }).click();
      await expect(page.locator('.auth-profile-status')).toContainText('Live AWS Connected');
      await expect(page.locator('.workspace-heading h1')).toBeVisible();
      await fits(page);
      if (role === 'Dispatcher') {
        const toolbar = await page.locator('.fleet-map-controls').boundingBox();
        const map = await page.locator('.fleet-map-shell .leaflet-container').boundingBox();
        expect(toolbar!.y + toolbar!.height).toBeLessThanOrEqual(map!.y);
        const tiles = page.locator('.fleet-map-shell img.leaflet-tile');
        await expect(tiles.first()).toHaveAttribute('src', /tile\.openstreetmap\.org/);
        expect(await tiles.evaluateAll(images => images.every(image => (image as HTMLImageElement).src.includes('tile.openstreetmap.org')))).toBe(true);
      }
      if (role === 'Auditor') {
        await expect(page.locator('.ward-ledger-table')).toBeVisible();
        expect(await page.locator('.ward-ledger-table th').first().evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(80);
      }
      if (role === 'Citizen') {
        const codeMessage = page.getByText('Generate a new code', { exact: true });
        expect(await codeMessage.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(20);
        expect(await codeMessage.evaluate(el => getComputedStyle(el).letterSpacing)).toBe('normal');
      }
      await page.screenshot({ path: `../.runtime/layout-${role.toLowerCase()}-${width}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

test('dispatcher empty queues and refill area explain the next step', async ({ page }) => {
  await mockAuth(page, 'Dispatcher');
  await page.route('**/api/v1/snapshot', r => r.fulfill({ json: empty }));
  await page.goto('/#signin');
  await page.getByLabel('Email address').fill('layout@example.org');
  await page.getByLabel('Password', { exact: true }).fill('LayoutTest123!');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByText('No tankers registered yet')).toBeVisible();
  await expect(page.getByText('Register a tanker before recording its refill and depot receipt.')).toBeVisible();
  await page.getByRole('button', { name: 'Incoming Tickets (0)' }).click();
  await expect(page.getByText('No incoming requests')).toBeVisible();
});
