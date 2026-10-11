import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(root, ".env");
export const config = Object.fromEntries(
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((x) => x.trim() && !x.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);
export function required(name) {
  const value = config[name];
  if (!value || value.includes("REPLACE"))
    throw new Error(`Fill ${name} in the root .env`);
  return value;
}
const mappings = {
  TableName: "TABLE_NAME",
  BusName: "EVENTS_BUS_NAME",
  GeofenceName: "GEOFENCE_COLLECTION_NAME",
  TrackerName: "TRACKER_NAME",
  RouteCalculatorName: "ROUTE_CALCULATOR_NAME",
  MapName: "MAP_NAME",
  BucketName: "POD_BUCKET_NAME",
  AllowedOrigin: "ALLOWED_ORIGIN",
  JwtIssuer: "JWT_ISSUER",
  JwtAudience: "JWT_AUDIENCE",
  BedrockModelId: "BEDROCK_MODEL_ID",
};
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...config },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status})`);
}
function parameters() {
  return Object.entries(mappings).map(([p, k]) => `${p}=${required(k)}`);
}
export function updateOutputs(outputs) {
  const mapping = {
    ApiUrl: "VITE_API_BASE_URL",
    TableName: "TABLE_NAME",
    QueueUrl: "SURGE_QUEUE_URL",
    StateMachineArn: "STATE_MACHINE_ARN",
    PolicyStoreId: "POLICY_STORE_ID",
    BucketName: "POD_BUCKET_NAME",
    IntakeFunction: "REQUEST_FUNCTION_NAME",
    ClassifierFunction: "CLASSIFIER_FUNCTION_NAME",
    OptimizerFunction: "OPTIMIZER_FUNCTION_NAME",
    TelemetryFunction: "TELEMETRY_FUNCTION_NAME",
    PodFunction: "POD_FUNCTION_NAME",
    FraudFunction: "FRAUD_FUNCTION_NAME",
  };
  let contents = readFileSync(path, "utf8");
  for (const o of outputs) {
    const key = mapping[o.OutputKey];
    if (key)
      contents = contents.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}=${o.OutputValue}`,
      );
  }
  writeFileSync(path, contents);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const command = process.argv[2] || "check";
    if (command === "check") {
      let missing = [];
      for (const name of Object.values(mappings)) {
        if (!config[name] || config[name].includes("REPLACE"))
          missing.push(name);
      }
      console.log(
        `Environment: ${path}\nFrontend mode: ${config.VITE_DATA_MODE}\nDeployment configuration: ${missing.length ? "needs " + missing.join(", ") : "ready"}`,
      );
      if (missing.length) process.exitCode = 1;
    } else if (command === "build")
      run("sam", ["build", "--template-file", "infra/template.yaml"]);
    else if (command === "deploy") {
      const args = [
        "deploy",
        "--template-file",
        ".aws-sam/build/template.yaml",
        "--stack-name",
        required("STACK_NAME"),
        "--region",
        required("AWS_REGION"),
        "--resolve-s3",
        "--capabilities",
        "CAPABILITY_IAM",
        "--parameter-overrides",
        ...parameters(),
        "--no-fail-on-empty-changeset",
      ];
      if (!process.argv.includes("--execute"))
        args.push("--no-execute-changeset");
      run("sam", args);
    } else if (command === "outputs") {
      const result = spawnSync(
        "aws",
        [
          "cloudformation",
          "describe-stacks",
          "--stack-name",
          required("STACK_NAME"),
          "--region",
          required("AWS_REGION"),
          "--output",
          "json",
        ],
        { cwd: root, encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, ...config } },
      );
      if (result.status !== 0)
        throw new Error(result.stderr || "AWS CLI unavailable");
      updateOutputs(JSON.parse(result.stdout).Stacks[0].Outputs);
      console.log("Stack outputs saved to the existing root .env.");
    } else throw new Error("Use check, build, deploy [--execute], or outputs.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
