// Opt-in live review: existing test accounts and stored data, no delivery mutations.
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const role of ['Citizen', 'Dispatcher', 'Driver', 'Auditor']) {
  test(`${role}: live AWS dashboard and controls`, async ({ page }) => {
    const report: Record<string, any> = { role, checkedAt: new Date().toISOString(), errors: [], calls: [] };
    mkdirSync('../.runtime/dashboard-review', { recursive: true });
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/api/v1/')) report.calls.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto('/');
      const pending = page.waitForResponse(response => response.url().endsWith('/api/v1/snapshot'));
      await page.getByRole('button', { name: `${role} Demo` }).click();
      const response = await pending;
      expect(response.status()).toBe(200);
      const snapshot = await response.json();
      const apiBase = new URL(response.url()).origin;
      report.counts = Object.fromEntries(['wards', 'depots', 'fleet', 'requests', 'anomalies'].map(k => [k, snapshot[k]?.length]));
      await expect(page.locator('.auth-profile-status')).toContainText('Live AWS Connected');
      if (role === 'Citizen') {
        if (snapshot.requests.length) await expect(page.getByText(snapshot.requests[0].id, { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Preview urgency' })).toBeHidden();
        await expect(page.getByRole('button', { name: 'Simulate Hindi Voice Note' })).toBeHidden();
        report.privateEvidenceStatus = await page.evaluate(async ({ apiBase, id }) => {
          const token = JSON.parse(sessionStorage.getItem('jalsetu.auth.v1')!).idToken;
          return (await fetch(`${apiBase}/api/v1/evidence?requestId=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })).status;
        }, { apiBase, id: snapshot.requests[0]?.id || 'review-nonexistent' });
        expect(report.privateEvidenceStatus).toBe(403);
        await page.reload();
        await expect(page.locator('.auth-profile-status')).toContainText('Live AWS Connected');
        if (snapshot.requests.length) await expect(page.getByText(snapshot.requests[0].id, { exact: true })).toBeVisible();
      }
      if (role === 'Dispatcher') {
        await page.getByRole('button', { name: /Incoming Tickets/ }).click();
        await page.getByRole('button', { name: 'Network radar', exact: true }).first().click();
        await expect(page.getByRole('img', { name: 'Network diagram of ward, depot and tanker coordinates' })).toBeVisible();
        await page.getByRole('button', { name: 'Tactical GPS', exact: true }).click();
        await expect(page.locator('.leaflet-container')).toBeVisible();
        await page.getByRole('button', { name: 'Open Natural Language Copilot' }).click();
        const answer = page.waitForResponse(r => r.url().endsWith('/api/v1/copilot'));
        await page.getByPlaceholder('Ask Bedrock Copilot in Hindi or English...').fill('State only the number of tankers and requests in the current snapshot and their statuses. Do not perform any actions.');
        await page.getByPlaceholder('Ask Bedrock Copilot in Hindi or English...').press('Enter');
        const result = await answer;
        report.copilot = { status: result.status(), body: await result.json() };
        expect(result.status()).toBe(200);
        expect(report.copilot.body.answer).toBeTruthy();
        await page.getByRole('button', { name: 'Close copilot' }).click();
      }
      if (role === 'Driver') {
        await expect(page.getByRole('button', { name: 'Start location sharing' })).toBeVisible();
        report.assignedStops = snapshot.fleet.reduce((n: number, t: any) => n + t.assignedRoute.length, 0);
        if (!report.assignedStops) await expect(page.getByText('All assigned stops complete')).toBeVisible();
        await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
        await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'English', exact: true }).click();
      }
      if (role === 'Auditor') {
        const download = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export ward CSV' }).click();
        await (await download).saveAs('../.runtime/dashboard-review/ward-export.csv');
        const inspect = page.getByRole('button', { name: 'Inspect private delivery evidence' }).first();
        await expect(inspect).toBeVisible();
        const evidence = page.waitForResponse(r => r.url().includes('/api/v1/evidence?'));
        await inspect.click();
        const result = await evidence;
        const data = await result.json();
        report.evidence = { status: result.status(), integrityVerified: data.integrityVerified, photoBase64Length: data.photoBase64?.length };
        expect(result.status()).toBe(200);
        const photo = page.getByRole('img', { name: /Private delivery evidence/ });
        await expect(photo).toBeVisible();
        report.evidence.display = await photo.evaluate(async (element: HTMLImageElement) => {
          try { await element.decode(); return { decodable: true, width: element.naturalWidth, height: element.naturalHeight }; }
          catch { return { decodable: false, width: element.naturalWidth, height: element.naturalHeight }; }
        });
        expect.soft(report.evidence.display.decodable, 'Stored delivery evidence must be a displayable photograph').toBe(true);
        expect.soft(report.evidence.display.width, 'Stored photo must satisfy the current 320px minimum width').toBeGreaterThanOrEqual(320);
        expect.soft(report.evidence.display.height, 'Stored photo must satisfy the current 240px minimum height').toBeGreaterThanOrEqual(240);
      }
      await page.screenshot({ path: `../.runtime/dashboard-review/${role.toLowerCase()}-desktop.png`, fullPage: true });
      for (const width of [360, 3840]) {
        await page.setViewportSize({ width, height: width === 360 ? 800 : 2160 });
        report[`overflowAt${width}`] = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        expect.soft(report[`overflowAt${width}`], `${role} overflow at ${width}px`).toBe(false);
      }
      expect(report.errors).toEqual([]);
      const revoked = page.waitForResponse(r => r.request().headers()['x-amz-target']?.endsWith('.RevokeToken'));
      await page.getByRole('button', { name: 'Sign out' }).click();
      expect((await revoked).ok()).toBe(true);
    } finally {
      writeFileSync(`../.runtime/dashboard-review/${role.toLowerCase()}.json`, JSON.stringify(report, null, 2));
    }
  });
}

test('anonymous public dashboard uses live, private-field-free data', async ({ page }) => {
  const pending = page.waitForResponse(r => r.url().endsWith('/api/v1/public'));
  await page.goto('/public');
  const response = await pending;
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.wards.length).toBeGreaterThan(0);
  expect(JSON.stringify(data)).not.toMatch(/"(?:phone|citizenName|otpHash|taskToken|photoKey|driverGps)"/);
  await expect(page.getByRole('button', { name: 'Export ward CSV' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('jalsetu.auth.v1'))).toBeNull();
});
