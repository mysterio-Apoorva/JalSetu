"""Render the evidence collected during the 2026-10-10 project audit."""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / '.runtime'
aws = json.loads((runtime / 'project-audit-aws.json').read_text())
browser = json.loads((runtime / 'project-audit-browser.json').read_text())
aws['storage']['photo_validation'][0].update({
    'dimensions': [1, 1], 'decoder': 'Windows System.Drawing.Image.FromFile',
    'decodable_image': True,
    'decoder_warning': 'Inconsistent progression sequence for component 0 coefficient 0',
    'assessment': '134-byte 1x1 test image; not meaningful delivery photography',
})
(runtime / 'project-audit-aws.json').write_text(json.dumps(aws, indent=2))

findings = [
    ('High', 'Delivery evidence validates bytes, not a meaningful photo',
     'The existing completed AWS delivery has a 134-byte 1x1 JPEG object. Its SHA-256 matches metadata. The backend checks length and three JPEG magic bytes; it does not decode the image or assess dimensions. A successful workflow proves software integration, not a physical water delivery.',
     'backend/lambdas/pod-verification-handler/index.js:124'),
    ('High', 'Citizen request restoration and OTP recovery are incomplete',
     'A real owned request was present in the API response but hidden on initial login/reload because tracking filters by the initially empty phone field. Entering the matching phone made it visible. The OTP only exists in the initial creation response and tab memory; no recovery/reissue flow exists. Multiple requests with the same phone can select the oldest response rather than the latest.',
     'frontend/src/components/citizen/CitizenPortal.tsx:33'),
    ('High', 'Auditor fraud count has no anomaly data source',
     'The board counts the anomalies prop. The backend returns anomalies only to Dispatcher; Auditor receives an empty array, and /public does not include anomalies. Therefore a standard Auditor cannot see the actual fraud count. The current dataset has zero anomalies, so this latent defect is established from source rather than a live nonzero example.',
     'backend/lambdas/citizen-request-intake/index.js:84'),
    ('High', 'Live request demand is fixed by the UI',
     'The citizen form always sends householdCount: 20. With the backend formula of 200 liters per household, UI submissions request 4,000 liters regardless of the actual community size. There is no household-count control.',
     'frontend/src/components/citizen/CitizenPortal.tsx:92'),
    ('Boundary', 'Public demo credentials are enabled',
     'One-tap demo accounts intentionally grant real role access, including Dispatcher, and their credentials are public browser material. This is suitable for the requested hackathon presentation, not deployment with real municipal records. Production requires removing demo access and retiring or restricting these accounts, alongside account recovery and MFA support.',
     'frontend/src/components/auth/AuthModal.tsx'),
    ('Medium', 'Verified Permissions is claimed but not deployed',
     'All six deployed Lambdas use POLICY_STORE_ID=local-cognito-rbac. The authoritative template contains no AVP policy store or policies; its reference excerpt is empty. The health script skips the AVP request but still prints PASS Verified Permissions. ArchitectureInspector and the service docs still describe Cedar as active. Cognito RBAC itself works: Citizen received 403 on four forbidden routes.',
     'scripts/aws-live.cjs:148'),
    ('Medium', 'Network radar control does not switch modes',
     'Clicking either Network radar control kept the Leaflet street map visible and never mounted the network diagram. Both callbacks set TACTICAL_GPS; the initial mode is also TACTICAL_GPS.',
     'frontend/src/components/dispatcher/DispatcherDashboard.tsx:86'),
    ('Medium', 'Telemetry is manually submitted, not a sensor stream',
     'GPS uses getCurrentPosition on explicit button clicks, with no watchPosition or continuous sender. The UI sends the ledger water level and hardcodes valveStatus=CLOSED. Real AWS tracking/geofence calls exist, but physical valve/flow sensing is absent. The latest observed tank level was 10,000 L while ledger capacity was 5,000 L; these are intentionally separate values, not interchangeable live measurements.',
     'frontend/src/App.tsx:564'),
    ('Medium', 'Map routes and deficit details are limited',
     'The base map is OpenStreetMap, and route drawings are straight polylines between stops. Backend dispatch uses real HERE road matrices through Amazon Location, but road geometry is not drawn. Every ward popup hardcodes Dry Days to 3-4 Days. Deficit classifications and populations currently match the seed data.',
     'frontend/src/components/dispatcher/LiveMap.tsx:245'),
    ('Medium', 'Alert resolution and evidence inspection are incomplete',
     'Dismiss only filters React state and a later snapshot can restore the alarm. Inspect Evidence only selects the tanker; there is no photo retrieval/evidence review endpoint. The fraud Lambda writes anomaly records but does not change tanker status, so its map styling does not automatically become ANOMALY_FLAGGED. No live anomaly exists to exercise the full alert UI.',
     'frontend/src/App.tsx:522'),
    ('Medium', 'Public UI is gated by authentication',
     'Anonymous GET /public returned 200 with aggregate data and no tested private field names. A fresh browser tab nevertheless showed login, so the public dashboard is not publicly browsable through the current UI.',
     'frontend/src/App.tsx:34'),
    ('Medium', 'Copilot works but labels and language handling need correction',
     'The real POST /copilot returned 200 and accurately described one request and one idle tanker, but answered the English query in Spanish. The deployed model is us.amazon.nova-lite-v1:0, while the loading text names Claude 3.5. Quick prompts contain nonexistent demo REQ-101 and score 94. This was one language test, not a multilingual evaluation.',
     'frontend/src/components/dispatcher/BedrockCopilotDrawer.tsx:248'),
    ('Medium', 'Dashboard touch targets fall below 48px',
     'All four dashboards fit the 360px document width with no uncaught page errors. However citizen inputs were 34px high, sliders 16px, Copilot launcher 32px, and public zone controls 24-26px. Login controls meet the size target; the rest of the product does not. Tests used desktop Chromium viewport emulation, not a physical Android device.',
     'frontend/src/components/citizen/CitizenPortal.tsx'),
    ('Boundary', 'Operational data is seeded demonstration data',
     'DynamoDB contained 2 wards, 1 demonstration depot, 1 demonstration tanker, 1 completed request, 1 audit record, and 0 anomalies. The static ward fields match bootstrap-records.json. The 5,000-liter total and Gini 0.50 are computed from that small dataset; they are not measurements of the whole city. Recorded-period volume has no automatic daily reset.',
     'backend/dynamodb/bootstrap-records.json'),
    ('Boundary', 'The local urgency preview and Hindi voice are simulations',
     'Preview urgency makes zero API calls and is correctly labeled Local triage preview (not Bedrock). Hindi voice selection inserts a predefined transcript after a timer; it does not record or transcribe speech. Actual asynchronous backend classification does invoke Bedrock. There is no SMS/WhatsApp adapter or automatic OTP delivery by phone.',
     'frontend/src/components/citizen/CitizenPortal.tsx:50'),
    ('Boundary', 'Benchmark/demo code is not measured live performance',
     'mockFleet.ts contains fixed distance, fuel, SLA and waiting-time results. The comparison is hidden in AWS mode. Demo Copilot responses are keyword canned responses. vrpOptimizer.ts, anomalyDetector.ts and generateSha256Mock are unused legacy helpers; their presence does not mean the live API uses fake routing or fake hashes.',
     'frontend/src/data/mockFleet.ts'),
    ('Medium', 'Operational and scale readiness is incomplete',
     'Snapshots query whole entity collections then filter, every 15 seconds per tab. Copilot loads whole collections without an input budget. The template has logs, X-Ray, DLQs and DynamoDB PITR, but no CloudWatch alarms or operational recovery UI. Workflow/OTP expiry, cancellation, refilling and evidence review need operator workflows. AVP errors would fall back to broader local RBAC if AVP were later configured. No load, penetration or disaster-recovery test was performed.',
     'backend/shared/core.js:193'),
    ('Medium', 'Documentation is materially stale',
     'README says port 5173 and default demo mode; current live origin is localhost:5174. AWS_SETUP still instructs JWT paste and says tokens are memory-only. VERIFICATION says no AWS deployment and 32 resources; the current source template has 27 pre-transform resources and a real deployed stack. AVP docs describe resources that are absent. Legacy snippets, model prompt JSON, seed schema and LocalStack scripts are not the current deployment source.',
     'docs/VERIFICATION.md'),
]

checks = {'project_documents_read': 27, 'backend_mocked_tests': '26/26 passed',
          'frontend_regression_tests': '12/12 passed', 'live_dashboard_audit': 'Completed; findings recorded, not an assertion that every feature is complete',
          'typescript_vite_build': 'Passed', 'frontend_lint': 'Passed',
          'infra_validation': 'Passed; 27 source resources, valid handler paths/references/workflow, identical template aliases',
          'live_dashboards_loading': '4/4', 'live_unauthorized_citizen_requests': '4/4 rejected with 403',
          'scope': 'All 27 first-party docs; application source, scripts and infrastructure. Dependency docs and generated duplicate docs excluded.',
          'not_run': 'No new live request, dispatch assignment, fabricated delivery, fraud event, rating mutation or physical Android test. Existing completed workflow evidence inspected. Deployed source byte comparison was not completed.'}
summary = {'date': '2026-10-10', 'verdict': 'Real AWS-backed hackathon prototype; incomplete municipal production system',
           'checks': checks, 'findings': [{'severity': a, 'title': b, 'detail': c, 'source': d} for a,b,c,d in findings]}
(runtime / 'project-audit-summary.json').write_text(json.dumps(summary, indent=2))

e = html.escape
rows = ''.join(f'<tr><td>{e(k.replace("_", " "))}</td><td>{e(v)}</td></tr>' for k,v in checks.items() if isinstance(v,str))
issues = ''.join(f'<article><span class="tag">{e(severity)}</span><h2>{i}. {e(title)}</h2><p>{e(detail)}</p><code>{e(source)}</code></article>' for i,(severity,title,detail,source) in enumerate(findings,1))
screens = ''.join(f'<a href="audit-{role}-desktop.png">{role.title()} desktop</a> · <a href="audit-{role}-mobile.png">mobile</a><br>' for role in ['citizen','dispatcher','driver','auditor'])
document = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAL-SETU project audit — 10 October 2026</title>
<style>body{{max-width:1000px;margin:40px auto;padding:0 22px;font:16px/1.7 system-ui;color:#172b3a;background:#f5f8fa}}h1{{line-height:1.2;font-size:36px}}h2{{font-size:20px;line-height:1.35}}p{{margin:12px 0}}article,section{{background:#fff;border:1px solid #dce6eb;border-radius:12px;padding:22px;margin:18px 0}}table{{width:100%;border-collapse:collapse}}td{{padding:10px;border-bottom:1px solid #e2e8f0;vertical-align:top}}td:first-child{{width:30%;font-weight:600}}.tag{{font-size:12px;background:#e0eef5;color:#075985;padding:4px 8px;border-radius:8px}}code{{font-size:12px;overflow-wrap:anywhere}}a{{color:#0369a1}}.lead{{font-size:20px}}@media print{{body{{background:white}}article{{break-inside:avoid}}}}</style>
<p>10 OCTOBER 2026 · REPOSITORY AND LIVE AWS AUDIT</p><h1>JAL-SETU has a real backend.<br>The product is still a prototype.</h1>
<p class="lead">Authentication, persistence, AI calls, routing infrastructure, storage and workflow callbacks are genuinely connected. The operational dataset is synthetic, several important UI controls and data paths are incomplete, and the architecture documentation overstates Verified Permissions integration.</p>
<section><h2>What was verified</h2><table>{rows}</table><p>One existing request completed a real Step Functions execution and produced matching 5,000-liter DynamoDB audit totals and a private, versioned S3 object. That object is a 134-byte 1x1 test image. This establishes software plumbing, not physical delivery.</p><p>The source deployment contains six Lambda functions, all currently Active on Node.js 22. The live model is Amazon Nova Lite. Request stream and FIFO queue mappings are enabled; queue and queue DLQ had no waiting messages. Two geofences are active and one device is registered.</p></section>
{issues}
<section><h2>Recommended repair order</h2><p>First fix citizen request/OTP recovery, household demand, auditor anomaly data and evidence validation. Then complete alarm review/resolution, GPS/sensor behavior, radar switching and mobile controls. Align the architecture page and documentation with the deployed services and model. Before using real municipal records, retire public demo access, finish account recovery, configure HTTPS hosting/origins and operational monitoring, and run a fresh instrumented end-to-end acceptance test with genuine photo/GPS inputs plus failure/recovery tests.</p></section>
<section><h2>Evidence files</h2><p><a href="project-audit-aws.json">AWS summaries</a> · <a href="project-audit-browser.json">Live browser observations</a> · <a href="project-audit-summary.json">Structured findings</a> · <a href="audit-ward-export.csv">Actual exported ward CSV</a></p><p>{screens}</p><p>The audit added diagnostic scripts/tests and report artifacts. Application behavior and cloud infrastructure were not changed.</p></section></html>'''
(runtime / 'project-audit-report.html').write_text(document, encoding='utf-8')
print('Created .runtime/project-audit-report.html and structured evidence summaries.')
