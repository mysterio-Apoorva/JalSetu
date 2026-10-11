import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './auth-fixture';
const empty = { wards: [], depots: [], fleet: [], requests: [], anomalies: [] };
test.beforeEach(async ({page})=>{
  await page.route('**/api/v1/needs',r=>r.fulfill({json:{reports:[],own:null,imageGenerationEnabled:false}}));
  await page.route('**/api/v1/planning/config',r=>r.fulfill({json:{origin:{name:'Test Jal Kendra',coordinates:{lat:28.6,lng:77.2}},otpEnabled:true}}));
  await page.route('**/api/v1/planning/context',r=>r.fulfill({json:{weather:{dryDays:6,averageTemperatureC:32,rainfall30DaysMm:12,endDate:'2026-10-10',sourceUrl:'https://open-meteo.com/en/docs'},population:{status:'COMPLETE',population:10000,densityPerKm2:2500,areaKm2:4,year:2025,sourceUrl:'https://api.worldpop.org/v2/'},errors:[]}}));
});
async function signIn(page: Page, role: string, connected = true) {
  await mockAuth(page, role);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Demo$/ })).toHaveCount(0);
  await page.getByLabel('Email address').fill('operator@example.org');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.locator('.auth-profile-status')).toContainText(connected ? 'Live AWS Connected' : 'Connecting to AWS');
}

test('resident selects a real map point and submits explicit household counts',async({page})=>{
  await page.route('**/api/v1/snapshot',r=>r.fulfill({json:empty}));
  let body:Record<string,unknown>|undefined;
  await page.route('**/api/v1/needs/report',r=>{body=r.request().postDataJSON();return r.fulfill({json:{report:{}}});});
  await signIn(page,'Citizen');
  await page.getByLabel('Locality name').fill('Resident locality');
  await page.getByLabel('Days without water',{exact:true}).fill('6');
  await page.getByLabel('Infants under 1 year in your household').fill('1');
  await page.getByLabel('Elders aged 60+ in your household').fill('2');
  await page.locator('.leaflet-container').first().click({position:{x:180,y:140}});
  await page.getByRole('button',{name:'Save household needs report'}).click();
  await expect(page.getByText(/Your household report was saved/)).toBeVisible();
  expect(body?.daysWithoutWater).toBe(6);expect(body?.infants).toBe(1);expect(body?.elders).toBe(2);
  expect(body?.coordinates).toHaveProperty('lat');
  await expect(page.getByRole('button',{name:'AI simulation awaits operator budget configuration'})).toBeDisabled();
  const scene = page.getByRole('img', {name: /AI-generated simulation of a tanker/});
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toBeVisible();
  await expect.poll(()=>scene.evaluate((img: HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(320);
});

test('invalid workspace data is reported without crashing or displaying invented records',async({page})=>{
  await page.route('**/api/v1/snapshot',r=>r.fulfill({json:{wards:[]}}));
  await signIn(page,'Citizen',false);
  await expect(page.getByRole('alert')).toContainText('Workspace service returned an invalid response');
  await expect(page.getByText('Waiting for your authorized AWS workspace. Connection retries automatically.')).toBeVisible();
});

test('road route uses selected destination and email OTP confirms only the simulation',async({page})=>{
  await page.route('**/api/v1/snapshot',r=>r.fulfill({json:empty}));
  await page.route('**/api/v1/planning/route',r=>{
    expect(r.request().postDataJSON()).toEqual({coordinates:{lat:28.63,lng:77.21}});
    return r.fulfill({json:{id:'route-1',origin:{name:'Test Jal Kendra',coordinates:{lat:28.6,lng:77.2}},destination:{lat:28.63,lng:77.21},distanceKm:8.3,durationMinutes:21,geometry:{coordinates:[[77.2,28.6],[77.205,28.62],[77.21,28.63]]},source:'Amazon Location / HERE',algorithm:'Provider-recommended truck road route'}});
  });
  await page.route('**/api/v1/planning/otp/send',r=>{
    expect(r.request().postDataJSON()).toEqual({id:'route-1'});
    return r.fulfill({json:{sent:true,destination:'r***@example.org'}});
  });
  await page.route('**/api/v1/planning/otp/verify',r=>{
    expect(r.request().postDataJSON()).toEqual({id:'route-1',code:'123456'});
    return r.fulfill({json:{confirmed:true,simulatedDelivery:true,verifiedLiters:0}});
  });
  await signIn(page,'Citizen');
  await page.getByLabel('Destination latitude').fill('28.63');
  await page.getByLabel('Destination longitude').fill('77.21');
  await page.getByRole('button',{name:'Use coordinates'}).click();
  await expect(page.getByText('2,500 people/km²')).toBeVisible();
  await page.getByRole('button',{name:'Calculate road route'}).click();
  await expect(page.getByText('8.3 km · approximately 21 minutes')).toBeVisible();
  await page.getByRole('button',{name:'Email confirmation code',exact:true}).click();
  await expect(page.getByText(/A real confirmation code was emailed/)).toBeVisible();
  await page.getByLabel('Email confirmation code',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Confirm simulation'}).click();
  await expect(page.getByText('Email code verified. Simulated delivery confirmed; no real water delivery recorded.')).toBeVisible();
  await page.setViewportSize({width:360,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:'../.runtime/planning-mobile.png',fullPage:true});
});

test('unconfigured origin and unavailable provider data never show a fabricated route or density',async({page})=>{
  await page.route('**/api/v1/snapshot',r=>r.fulfill({json:empty}));
  await page.route('**/api/v1/planning/config',r=>r.fulfill({json:{origin:null,otpEnabled:false}}));
  await page.route('**/api/v1/planning/context',r=>r.fulfill({json:{weather:null,population:null,errors:['Provider unavailable']}}));
  await signIn(page,'Citizen');
  await page.locator('.leaflet-container').first().click({position:{x:180,y:140}});
  await expect(page.getByRole('button',{name:'Calculate road route'})).toBeDisabled();
  await expect(page.getByText('Population unavailable. No density value is invented.')).toBeVisible();
});
test('invalid needs response does not crash the signed-in workspace',async({page})=>{
  await page.route('**/api/v1/snapshot',r=>r.fulfill({json:empty}));
  await page.route('**/api/v1/needs',r=>r.fulfill({json:{unexpected:true}}));
  await signIn(page,'Citizen');
  await expect(page.getByText('Needs service returned an invalid response. Please retry later.')).toBeVisible();
  await expect(page.locator('.auth-profile-status')).toBeVisible();
});
test('published resident signup cannot choose a staff role and empty data stays empty', async ({ page }) => {
  await page.route('**/api/v1/snapshot', r => r.fulfill({ json: empty }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dispatcher', exact: true })).toHaveCount(0);
  await signIn(page, 'Citizen');
  await expect(page.getByText(/No verified service areas are available/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request Emergency Tanker' })).toHaveCount(0);
  await expect(page.getByText(/Anil Aggarwal|DL-01-TK-101|Sangam Vihar/)).toHaveCount(0);
});
test('auditor receives an explicit invalid-photo warning and no placeholder image', async ({ page }) => {
  await page.route('**/api/v1/snapshot', r => r.fulfill({ json: empty }));
  await page.route('**/api/v1/public', r => r.fulfill({ json: { wards: [], deliveries: [{ id: 'evidence-record', status: 'DELIVERED_VERIFIED', litersDelivered: 200, proofHash: 'hash', wardId: 'w1' }] } }));
  await page.route('**/api/v1/evidence?*', r => r.fulfill({ json: { photoValid: false, integrityVerified: true, photoError: 'Stored photo is invalid or below the minimum dimensions.' } }));
  await signIn(page, 'Auditor');
  await page.getByRole('button', { name: 'Inspect private delivery evidence' }).click();
  await expect(page.getByRole('alert')).toContainText('Stored photo is invalid');
  await expect(page.getByRole('img', { name: /Private delivery evidence/ })).toHaveCount(0);
});
test('dispatcher refill uses the receipt and server endpoint; GPS age is explicit', async ({ page }) => {
  await page.route('**/api/v1/snapshot', r => r.fulfill({ json: { ...empty, fleet: [{ id: 't1', vehicleNumber: 'Verified-vehicle', driverName: 'Assigned driver', depotName: 'Approved depot', status: 'IDLE', assignedRoute: [], currentCoordinates: {lat:28.5,lng:77.2}, capacityLiters:10000, currentWaterLevelLiters:5000, speedKmph:0, telemetryAt:'2020-01-01T00:00:00Z' }] } }));
  let calls = 0;
  await page.route('**/api/v1/fleet/refill', r => {
    const b = r.request().postDataJSON();
    expect(b.tankerId).toBe('t1'); expect(b.litersAdded).toBe(2000); expect(b.receiptReference).toBe('receipt-2026-42'); expect(b.idempotencyKey).toBeTruthy(); calls++;
    return r.fulfill({ json: { success: true } });
  });
  await signIn(page, 'Dispatcher');
  await expect(page.getByText(/Stale location; contact driver/).first()).toBeVisible();
  await page.getByLabel('Idle tanker').selectOption('t1');
  await page.getByLabel('Litres added').fill('2000');
  await page.getByLabel('Depot receipt reference').fill('receipt-2026-42');
  await page.getByRole('button', { name: 'Record refill', exact: true }).click();
  await expect(page.getByText('Refill recorded against the depot receipt.')).toBeVisible();
  expect(calls).toBe(1);
});
