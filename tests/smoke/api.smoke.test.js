const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const projectRoot =
  "/Users/macbookpro2019/Desktop/Clients/Kisumu/CountyCore - Production/countycore-backend";
const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess;
let sessionToken = "";

async function waitForHealth() {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (_error) {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Server did not become healthy in time");
}

async function loginAsAdmin() {
  const response = await fetch(`${baseUrl}/api/session/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: { id: "admin01", name: "Beatrice Kamau", role: "admin" },
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.token);
  return body.token;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  };
}

test.before(async () => {
  serverProcess = spawn("node", ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      MPESA_MODE: "mock",
      COOPBANK_MODE: "mock",
      NOTIFY_MODE: "mock",
      MPESA_CALLBACK_TOKEN: "test-mpesa-token",
      COOPBANK_CALLBACK_TOKEN: "test-coop-token",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForHealth();
  sessionToken = await loginAsAdmin();
});

test.after(() => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
});

test("rejects delete requests globally", async () => {
  const response = await fetch(`${baseUrl}/api/ledger`, { method: "DELETE" });
  assert.equal(response.status, 405);
});

test("auth login requires OTP then verifies and issues session token", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "admin01", password: "Admin@2026" }),
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.requiresOtp, true);
  assert.ok(loginBody.challengeId);
  assert.ok(loginBody.debugCode);

  const verify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: loginBody.challengeId,
      code: loginBody.debugCode,
    }),
  });
  assert.equal(verify.status, 200);
  const verifyBody = await verify.json();
  assert.ok(verifyBody.token);
});

test("supports ledger write/read flow", async () => {
  const postEntry = await fetch(`${baseUrl}/api/ledger`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      entry: {
        module: "Payments",
        refId: "PAY-1001",
        description: "Smoke test payment",
        amount: 1500,
        method: "M-Pesa",
      },
    }),
  });
  assert.equal(postEntry.status, 201);

  const listResponse = await fetch(`${baseUrl}/api/ledger`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.ok(Array.isArray(listBody.entries));
  assert.ok(listBody.entries.some((entry) => entry.refId === "PAY-1001"));
});

test("synchronizes business state payload", async () => {
  const putState = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      state: {
        BILL_REGISTER: [{ id: "BILL-1", amount: 5000 }],
        PERMITS: [{ permitNo: "P-001", status: "Issued" }],
      },
    }),
  });
  assert.equal(putState.status, 200);

  const getState = await fetch(`${baseUrl}/api/state`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert.equal(getState.status, 200);
  const getBody = await getState.json();
  assert.equal(getBody.state.BILL_REGISTER[0].id, "BILL-1");
  assert.equal(getBody.state.PERMITS[0].permitNo, "P-001");
});

test("initiates M-Pesa STK and consumes webhook callback", async () => {
  const start = await fetch(`${baseUrl}/api/integrations/mpesa/stk-push`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      phoneNumber: "254712345678",
      amount: 2500,
      accountReference: "INV-7788",
      transactionDesc: "Permit Payment",
    }),
  });
  assert.equal(start.status, 202);
  const startBody = await start.json();
  assert.equal(startBody.event.provider, "mpesa");

  const callback = await fetch(`${baseUrl}/api/webhooks/mpesa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-callback-token": "test-mpesa-token",
    },
    body: JSON.stringify({
      Body: {
        stkCallback: {
          MerchantRequestID: "123",
          CheckoutRequestID: "ws_CO_123",
          ResultCode: 0,
          ResultDesc: "Success",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 2500 },
              { Name: "MpesaReceiptNumber", Value: "QWE1234" },
              { Name: "PhoneNumber", Value: "254712345678" },
              { Name: "AccountReference", Value: "INV-7788" },
            ],
          },
        },
      },
    }),
  });
  assert.equal(callback.status, 200);

  const listResponse = await fetch(`${baseUrl}/api/ledger`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const listBody = await listResponse.json();
  assert.ok(listBody.entries.some((entry) => entry.refId === "QWE1234"));
});

test("initiates Coop Bank collection and consumes webhook callback", async () => {
  const start = await fetch(`${baseUrl}/api/integrations/coopbank/collection`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      reference: "COOP-REF-001",
      accountNumber: "0100123456789",
      payerName: "County Core Ltd",
      amount: 3900,
      narration: "Rates collection",
    }),
  });
  assert.equal(start.status, 202);
  const startBody = await start.json();
  assert.equal(startBody.event.provider, "coopbank");

  const callback = await fetch(`${baseUrl}/api/webhooks/coopbank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-callback-token": "test-coop-token",
    },
    body: JSON.stringify({
      status: "success",
      reference: "COOP-REF-001",
      transactionId: "CB-998",
      amount: 3900,
      accountNumber: "0100123456789",
    }),
  });
  assert.equal(callback.status, 200);

  const ledgerRes = await fetch(`${baseUrl}/api/ledger`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const ledgerBody = await ledgerRes.json();
  assert.ok(ledgerBody.entries.some((entry) => entry.refId === "COOP-REF-001"));
});

test("sends and verifies OTP and sends transaction notification", async () => {
  const sendOtp = await fetch(`${baseUrl}/api/notifications/otp/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      recipient: "254700000001",
      purpose: "login",
      channel: "sms",
    }),
  });
  assert.equal(sendOtp.status, 200);
  const otpBody = await sendOtp.json();
  assert.ok(otpBody.otpId);
  assert.ok(otpBody.debugCode);

  const verifyOtp = await fetch(`${baseUrl}/api/notifications/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: "254700000001",
      purpose: "login",
      code: otpBody.debugCode,
    }),
  });
  assert.equal(verifyOtp.status, 200);

  const txnNotify = await fetch(`${baseUrl}/api/notifications/transaction`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      recipient: "254700000001",
      channel: "sms",
      reference: "TXN-NOTIFY-01",
      amount: 850,
    }),
  });
  assert.equal(txnNotify.status, 200);
});
