import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

test('audit live dashboards, controls, data provenance and role boundaries', async ({ context }) => {
  const report: Record<string, any> = { dashboards: {}, checks: [] };
  const pages = [];
  mkdirSync('../.runtime', { recursive: true });
  try {
    for (const role of ['Citizen', 'Dispatcher', 'Driver', 'Auditor']) {
      const page = await context.newPage(); pages.push(page);
      const errors: string[] = [];
      const calls: { path: string; status: number }[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().includes('/api/v1/')) calls.push({ path: new URL(response.url()).pathname, status: response.status() }); });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto('/');
      const loaded = page.waitForResponse(response => response.url().endsWith('/api/v1/snapshot'));
      await page.getByRole('button', { name: `${role} Demo` }).click();
      const snapshot = await (await loaded).json();
      await expect(page.locator('.auth-profile-status')).toContainText('Live AWS Connected', { timeout: 30000 });
      const result: Record<string, any> = report.dashboards[role] = { errors, calls,
        counts: Object.fromEntries(['wards', 'depots', 'fleet', 'requests', 'anomalies'].map(k => [k, snapshot[k]?.length])),
        navigation: await page.locator('.role-tab').allTextContents() };
      if (role === 'Citizen') {
        const before = calls.length;
        await page.getByRole('button', { name: 'Preview urgency' }).click();
        result.localPreviewLabeled = await page.getByText('Local triage preview (not Bedrock)').isVisible();
        result.previewApiCalls = calls.length - before;
        await page.getByRole('button', { name: 'Simulate Hindi Voice Note' }).click();
        await expect(page.getByLabel('Days without water')).toHaveValue('4');
        result.voiceIsSimulated = (await page.getByLabel('Complaint Details (Hindi / Eng / Voice)').inputValue()).includes('4 days zero water');
        result.existingRequestHiddenInitially = snapshot.requests.length > 0 && await page.getByText('Your request and private delivery code will appear here after submission.').isVisible();
        if (snapshot.requests[0]) {
          await page.getByLabel('Mobile (For OTP & Tracking)').fill(snapshot.requests[0].phone);
          result.existingRequestVisibleAfterPhone = await page.getByText(snapshot.requests[0].id, { exact: true }).isVisible();
          result.otpRecoverable = !!snapshot.requests[0].expectedOtp;
          await page.reload();
          await expect(page.locator('.auth-profile-status')).toContainText('Live AWS Connected');
          result.requestHiddenAfterReload = await page.getByText('Your request and private delivery code will appear here after submission.').isVisible();
        }
      }
      if (role === 'Dispatcher') {
        await page.getByRole('button', { name: /Incoming Tickets/ }).click();
        result.ticketVisible = snapshot.requests.length ? await page.getByText(snapshot.requests[0].status, { exact: true }).isVisible() : null;
        await page.getByRole('button', { name: 'Network radar', exact: true }).first().click();
        result.radarDiagramVisibleAfterClick = await page.getByRole('img', { name: 'Network diagram of ward, depot and tanker coordinates' }).isVisible();
        result.streetMapStillPresent = await page.locator('.leaflet-container').count() > 0;
        await page.getByRole('button', { name: 'Open Natural Language Copilot' }).click();
        const copilotResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/copilot'), { timeout: 35000 });
        await page.getByPlaceholder('Ask Bedrock Copilot in Hindi or English...').fill('How many tankers and requests are in the supplied snapshot, and what are their current statuses? Do not perform any actions.');
        await page.getByPlaceholder('Ask Bedrock Copilot in Hindi or English...').press('Enter');
        const response = await copilotResponse;
        const answer = await response.json();
        result.copilot = { status: response.status(), answer: answer.answer || answer.error };
        await page.getByRole('button', { name: 'Close copilot' }).click();
        // Invoke dispatch only if the real snapshot has no scheduled work, so the audit cannot assign a vehicle.
        if (!snapshot.requests.some((r: any) => r.status === 'SCHEDULED')) {
          const response = page.waitForResponse(response => response.url().endsWith('/api/v1/optimize'));
          await page.getByRole('button', { name: 'Dispatch pending requests' }).click();
          const optimized = await response;
          const value = await optimized.json();
          result.emptyDispatch = { status: optimized.status(), assignments: value.assignments?.length, unassigned: value.unassigned, error: value.error };
        }
      }
      if (role === 'Driver') {
        result.idleState = await page.getByText('All assigned stops complete').isVisible();
        result.gpsButtonAvailableWhenIdle = await page.getByRole('button', { name: 'Send current GPS location' }).count() > 0;
        const languageButton = page.getByRole('button', { name: 'हिंदी' });
        await languageButton.click();
        result.hindiToggle = await page.getByRole('button', { name: 'English', exact: true }).isVisible();
        await page.getByRole('button', { name: 'English', exact: true }).click();
      }
      if (role === 'Auditor') {
        await expect(page.getByRole('button', { name: 'Export ward CSV' })).toBeVisible();
        const download = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export ward CSV' }).click();
        const file = await download;
        await file.saveAs('../.runtime/audit-ward-export.csv');
        result.csvExport = file.suggestedFilename();
        const publicResponse = await page.evaluate(async () => {
          const result = await fetch('https://qxa58ayy64.execute-api.us-east-1.amazonaws.com/api/v1/public');
          return { status: result.status, data: await result.json() };
        });
        result.anonymousApi = { status: publicResponse.status, wards: publicResponse.data.wards?.length,
          deliveries: publicResponse.data.deliveries?.length,
          privacyFieldsFound: /"(?:phone|citizenName|otpHash|taskToken|photoKey|driverGps)"/.test(JSON.stringify(publicResponse.data)) };
        if (publicResponse.data.deliveries?.length) await expect(page.getByText(publicResponse.data.deliveries[0].proofHash, { exact: true })).toBeVisible();
        result.bodyMetrics = (await page.locator('main').innerText()).slice(0, 1700);
      }
      await page.screenshot({ path: `../.runtime/audit-${role.toLowerCase()}-desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 360, height: 800 });
      result.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      result.smallVisibleControls = await page.locator('button, input, select').evaluateAll(elements => elements.filter(element => {
        const b = element.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 48 || b.height < 48);
      }).map(element => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 65) || element.getAttribute('id'),
        width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })).slice(0, 18));
      await page.screenshot({ path: `../.runtime/audit-${role.toLowerCase()}-mobile.png`, fullPage: true });
      await page.locator('#nav-tab-aws_architecture').click();
      await page.getByRole('button', { name: /Verified Permissions/ }).click();
      result.architectureClaimsCedar = await page.getByText(/Cedar policies evaluate trusted JWT roles/).isVisible();
    }
    const anon = await context.newPage(); pages.push(anon); await anon.goto('/');
    report.anonymousUiRequiresLogin = await anon.getByLabel('Email address').isVisible();
    // Denied endpoints must reject the wrong role before any mutation.
    report.roleDenials = await pages[0].evaluate(async () => {
      const token = JSON.parse(sessionStorage.getItem('jalsetu.auth.v1')!).idToken;
      const paths = ['/optimize', '/copilot', '/telemetry', '/delivery/verify'];
      const result = [];
      for (const path of paths) {
        const response = await fetch('https://qxa58ayy64.execute-api.us-east-1.amazonaws.com/api/v1' + path, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: '{}',
        });
        result.push({ path, status: response.status });
      }
      return result;
    });
  } finally {
    writeFileSync('../.runtime/project-audit-browser.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    for (const page of pages) {
      const button = page.getByRole('button', { name: 'Sign out' });
      if (await button.count()) {
        const revoked = page.waitForResponse(response => response.request().headers()['x-amz-target']?.endsWith('.RevokeToken')).catch(() => null);
        await button.click(); await revoked;
      }
    }
  }
});
