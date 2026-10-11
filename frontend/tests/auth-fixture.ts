import { type Page } from "@playwright/test";
export function tokens(role = "Citizen", lifetime = 3600) {
  const common = {
    iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ko5ROUcaz",
    sub: role,
    exp: Math.floor(Date.now() / 1000) + lifetime,
  };
  const jwt = (claims: object) =>
    `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.fixture`;
  return {
    IdToken: jwt({
      ...common,
      aud: "16ploao82gc7qg4djtua5sdbuh",
      token_use: "id",
      email: `${role.toLowerCase()}@jalsetu.local`,
      "cognito:groups": [role],
    }),
    AccessToken: jwt({
      ...common,
      client_id: "16ploao82gc7qg4djtua5sdbuh",
      token_use: "access",
    }),
    RefreshToken: `refresh-${role}`,
  };
}
export async function mockAuth(page: Page, role = "Citizen") {
  const result = tokens(role);
  await page.route("https://cognito-idp.us-east-1.amazonaws.com/", (route) =>
    route.fulfill({ json: { AuthenticationResult: result } }),
  );
  return result;
}
export async function login(page: Page, role = "Citizen") {
  await page.goto("/");
  await page.getByRole("button", { name: `${role} Demo` }).click();
}
