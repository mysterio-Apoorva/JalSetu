import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, ".env");
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((x) => x.trim() && !x.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const clientId = env.JWT_AUDIENCE || "16ploao82gc7qg4djtua5sdbuh";
const region = env.AWS_REGION || "us-east-1";

const USERS = {
  citizen: { username: "citizen@jalsetu.local", password: "CitizenPass123!", role: "Citizen" },
  driver: { username: "driver@jalsetu.local", password: "DriverPass123!", role: "Driver" },
  dispatcher: { username: "dispatcher@jalsetu.local", password: "DispatcherPass123!", role: "Dispatcher" },
  auditor: { username: "auditor@jalsetu.local", password: "AuditorPass123!", role: "Auditor" },
};

async function fetchToken(username, password) {
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.AuthenticationResult) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data.AuthenticationResult;
}

const targetRole = process.argv[2]?.toLowerCase();

if (targetRole && USERS[targetRole]) {
  const { username, password } = USERS[targetRole];
  try {
    const result = await fetchToken(username, password);
    console.log(result.IdToken);
  } catch (err) {
    console.error(`Error authenticating ${targetRole}:`, err.message);
    process.exit(1);
  }
} else {
  console.log("=== JAL-SETU COGNITO JWT TOKENS ===\n");
  for (const [key, { username, password, role }] of Object.entries(USERS)) {
    try {
      const result = await fetchToken(username, password);
      console.log(`[${role.toUpperCase()}] (${username})`);
      console.log(`Password: ${password}`);
      console.log(`ID Token (use in browser UI or Authorization: Bearer <token>):`);
      console.log(result.IdToken);
      console.log("\n" + "-".repeat(60) + "\n");
    } catch (err) {
      console.error(`[${role}] Authentication failed:`, err.message);
    }
  }
  console.log("Tip: Run `node scripts/get-tokens.mjs <role>` (e.g. `citizen`, `driver`, `dispatcher`, `auditor`) to get just the token string.");
}
