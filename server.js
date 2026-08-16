const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

let PrismaClient = null;
try {
  ({ PrismaClient } = require("@prisma/client"));
} catch (_error) {
  PrismaClient = null;
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;
const FRONTEND_FILE = path.join(ROOT_DIR, "countycore_v9.html");
const DATA_DIR = path.join(ROOT_DIR, ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const HAS_SQL = Boolean(process.env.DATABASE_URL && PrismaClient);
const prisma = HAS_SQL ? new PrismaClient() : null;

const CONFIG = {
  mpesa: {
    mode: process.env.MPESA_MODE || "mock",
    baseUrl: process.env.MPESA_BASE_URL || "",
    authUrl: process.env.MPESA_AUTH_URL || "",
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    shortcode: process.env.MPESA_SHORTCODE || "",
    passkey: process.env.MPESA_PASSKEY || "",
    callbackUrl:
      process.env.MPESA_CALLBACK_URL || "http://127.0.0.1:3000/api/webhooks/mpesa",
    stkPath: process.env.MPESA_STK_PATH || "/mpesa/stkpush/v1/processrequest",
    callbackToken: process.env.MPESA_CALLBACK_TOKEN || "dev-mpesa-callback-token",
  },
  coop: {
    mode: process.env.COOPBANK_MODE || "mock",
    baseUrl: process.env.COOPBANK_BASE_URL || "",
    tokenUrl: process.env.COOPBANK_TOKEN_URL || "",
    clientId: process.env.COOPBANK_CLIENT_ID || "",
    clientSecret: process.env.COOPBANK_CLIENT_SECRET || "",
    collectionPath: process.env.COOPBANK_COLLECTION_PATH || "/payments/collect",
    callbackToken: process.env.COOPBANK_CALLBACK_TOKEN || "dev-coop-callback-token",
  },
  notifications: {
    mode: process.env.NOTIFY_MODE || "mock",
    baseUrl: process.env.NOTIFY_BASE_URL || "",
    apiKey: process.env.NOTIFY_API_KEY || "",
    otpPath: process.env.NOTIFY_OTP_PATH || "/otp/send",
    transactionPath:
      process.env.NOTIFY_TRANSACTION_PATH || "/notifications/transaction",
    senderId: process.env.NOTIFY_SENDER_ID || "CountyCore",
    otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS || 300),
  },
};

function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

const RBAC_ROLES = {
  admin: {
    label: "System Administrator",
    department: "Platform Administration",
    pages: ["dashboard","citizen","analytics","revstreams","billing","arrears","gis","feeengine","planapproval","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","str-rents","str-liquor","str-bodaboda","str-publichealth","payments","ledger","wallet","micropayments","ussd","compliance","enforcement","treasury","procurement","hr","assets","settings","audit"],
    permissions: ["auth:login","session:manage","users:manage","state:read","state:write","audit:read","ledger:read","ledger:write","payments:receive","payments:review","reports:read","gis:manage","permits:review","enforcement:openCase","notifications:send","integrations:manage","roles:manage","settings:manage"],
    scopes: ["platform:admin"],
    canCreate: ["finance","auditor","executive","chiefofficer","director","legal","supervisor","gisofficer","intakeofficer","reviewofficer","inspector","officer","cashier","enforcer"],
  },
  executive: {
    label: "County Executive (CECM)",
    department: "Executive Office",
    pages: ["dashboard","citizen","analytics","revstreams","gis","feeengine","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","ledger","micropayments","compliance","enforcement"],
    permissions: ["state:read","audit:read","ledger:read","reports:read","permits:review","enforcement:openCase","notifications:send"],
    scopes: ["executive:approve"],
    canCreate: [],
  },
  chiefofficer: {
    label: "Chief Officer",
    department: "Departmental Management",
    pages: ["dashboard","citizen","analytics","revstreams","gis","feeengine","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","ledger","compliance","enforcement","procurement","assets"],
    permissions: ["state:read","audit:read","ledger:read","reports:read","permits:review","enforcement:openCase","notifications:send"],
    scopes: ["department:approve"],
    canCreate: ["director"],
  },
  director: {
    label: "Director",
    department: "Department Delivery",
    pages: ["dashboard","citizen","gis","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","compliance","enforcement"],
    permissions: ["state:read","audit:read","ledger:read","reports:read","permits:review","enforcement:openCase","notifications:send"],
    scopes: ["department:review"],
    canCreate: [],
  },
  supervisor: {
    label: "Supervisor",
    department: "Operations Oversight",
    pages: ["dashboard","citizen","analytics","revstreams","gis","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","ledger","enforcement","compliance"],
    permissions: ["state:read","audit:read","ledger:read","reports:read","permits:review","enforcement:openCase","notifications:send"],
    scopes: ["approval:override"],
    canCreate: [],
  },
  finance: {
    label: "Finance Manager",
    department: "Finance & Treasury",
    pages: ["dashboard","citizen","analytics","revstreams","billing","arrears","gis","feeengine","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","payments","ledger","wallet","micropayments","compliance","treasury","procurement","hr","assets","audit"],
    permissions: ["state:read","audit:read","ledger:read","ledger:write","payments:receive","payments:review","reports:read","notifications:send","integrations:manage"],
    scopes: ["finance:reconcile"],
    canCreate: ["officer","executive"],
  },
  intakeofficer: {
    label: "Intake Officer",
    department: "Front Office",
    pages: ["dashboard","citizen","permits","bpReports","oda","planapproval","markets","str-liquor","str-bodaboda","str-publichealth"],
    permissions: ["state:read","audit:read","reports:read","permits:review","notifications:send"],
    scopes: ["intake:validate"],
    canCreate: [],
  },
  reviewofficer: {
    label: "Reviewing Officer",
    department: "Case Review",
    pages: ["dashboard","citizen","gis","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth"],
    permissions: ["state:read","audit:read","reports:read","permits:review","notifications:send"],
    scopes: ["review:recommend"],
    canCreate: [],
  },
  inspector: {
    label: "Inspector / Field Officer",
    department: "Field Operations",
    pages: ["dashboard","citizen","gis","permits","oda","planapproval","markets","parking","str-cess","str-stockring","str-slaughter","str-rents","str-liquor","str-bodaboda","str-publichealth"],
    permissions: ["state:read","audit:read","reports:read","gis:manage","notifications:send"],
    scopes: ["field:inspect"],
    canCreate: [],
  },
  officer: {
    label: "Revenue Officer",
    department: "Revenue Operations",
    pages: ["dashboard","citizen","revstreams","billing","arrears","gis","feeengine","permits","bpReports","markets","parking","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","ledger","micropayments","enforcement","assets","settings"],
    permissions: ["state:read","state:write","audit:read","ledger:read","ledger:write","payments:receive","reports:read","permits:review","notifications:send"],
    scopes: ["billing:collect"],
    canCreate: ["cashier","enforcer"],
  },
  legal: {
    label: "Legal Liaison",
    department: "Legal Services",
    pages: ["dashboard","citizen","arrears","compliance","enforcement","ledger","audit"],
    permissions: ["state:read","audit:read","ledger:read","reports:read","enforcement:openCase","notifications:send"],
    scopes: ["legal:review"],
    canCreate: [],
  },
  cashier: {
    label: "Collections Agent",
    department: "Receipting",
    pages: ["dashboard","billing","arrears","permits","markets","parking","str-rents","payments","wallet","micropayments","ussd"],
    permissions: ["state:read","ledger:read","ledger:write","payments:receive","notifications:send"],
    scopes: ["receipts:issue"],
    canCreate: [],
  },
  enforcer: {
    label: "Enforcement Officer",
    department: "Enforcement",
    pages: ["dashboard","arrears","markets","parking","str-cess","str-stockring","str-bodaboda","enforcement","citizen"],
    permissions: ["state:read","audit:read","reports:read","enforcement:openCase","notifications:send"],
    scopes: ["enforcement:openCase"],
    canCreate: [],
  },
  gisofficer: {
    label: "GIS Officer",
    department: "Spatial Data",
    pages: ["dashboard","citizen","analytics","gis","oda","planapproval","permits","markets","parking","str-cess","str-stockring","str-slaughter","str-rents","str-liquor","str-bodaboda","str-publichealth"],
    permissions: ["state:read","audit:read","reports:read","gis:manage","notifications:send"],
    scopes: ["gis:manage"],
    canCreate: [],
  },
  auditor: {
    label: "Auditor",
    department: "Internal Audit",
    pages: ["dashboard","analytics","arrears","billing","str-cess","str-stockring","str-slaughter","oda","odaReports","planapproval","str-rents","str-liquor","str-bodaboda","str-publichealth","compliance","ledger","audit"],
    permissions: ["state:read","audit:read","ledger:read","reports:read"],
    scopes: ["audit:review"],
    canCreate: [],
  },
  payer: {
    label: "Applicant / Trader / Owner / Agent",
    department: "Citizen Services",
    pages: ["dashboard","billing","arrears","permits","payments","wallet","micropayments","ussd"],
    permissions: ["state:read","payments:receive","notifications:send"],
    scopes: ["self:manage"],
    canCreate: [],
  },
};

function normalizeAuthUser(user) {
  const rolePolicy = RBAC_ROLES[user.role] || RBAC_ROLES.payer;
  return {
    ...user,
    passwordHash: user.passwordHash || hashSecret(user.password || ""),
    department: user.department || rolePolicy.department,
    permissions: Array.isArray(user.permissions) ? user.permissions : (rolePolicy.permissions || []),
    scopes: Array.isArray(user.scopes) ? user.scopes : (rolePolicy.scopes || []),
    pages: Array.isArray(user.pages) ? user.pages : (rolePolicy.pages || []),
    canCreate: Array.isArray(user.canCreate) ? user.canCreate : (rolePolicy.canCreate || []),
    roleLabel: user.roleLabel || rolePolicy.label,
  };
}

const AUTH_USERS = Object.fromEntries(
  Object.entries({
    admin01: {
      id: "admin01",
      name: "Beatrice Kamau",
      role: "admin",
      password: "Admin@2026",
      avatar: "BK",
      badge: "System Administrator",
      sub: "All Departments",
      phone: "254700000101",
      twoFA: true,
    },
    exec01: {
      id: "exec01",
      name: "Caroline Atieno",
      role: "executive",
      password: "Executive@2026",
      avatar: "CA",
      badge: "County Executive (CECM)",
      sub: "Office of the Governor",
      phone: "254700000102",
      twoFA: true,
    },
    cho01: {
      id: "cho01",
      name: "Susan Akinyi",
      role: "chiefofficer",
      password: "ChiefOfficer@2026",
      avatar: "SA",
      badge: "Chief Officer",
      sub: "Lands, Housing & Physical Planning",
      phone: "254700000103",
      twoFA: true,
    },
    dir01: {
      id: "dir01",
      name: "Peter Nyongo",
      role: "director",
      password: "Director@2026",
      avatar: "PN",
      badge: "Director, Physical Planning",
      sub: "Lands & Physical Planning",
      phone: "254700000104",
      twoFA: true,
    },
    sup01: {
      id: "sup01",
      name: "Mary Adhiambo",
      role: "supervisor",
      password: "Supervisor@2026",
      avatar: "MA",
      badge: "Supervisor",
      sub: "Kisumu Central",
      phone: "254700000105",
      twoFA: true,
    },
    fin01: {
      id: "fin01",
      name: "James Mwangi",
      role: "finance",
      password: "Finance@2026",
      avatar: "JM",
      badge: "Finance Manager",
      sub: "Finance & Treasury",
      phone: "254700000106",
      twoFA: true,
    },
    int01: {
      id: "int01",
      name: "Lilian Achieng",
      role: "intakeofficer",
      password: "Intake@2026",
      avatar: "LA",
      badge: "Intake Officer",
      sub: "Front Office",
      phone: "254700000107",
      twoFA: true,
    },
    rev01: {
      id: "rev01",
      name: "Kevin Otieno",
      role: "reviewofficer",
      password: "Review@2026",
      avatar: "KO",
      badge: "Reviewing Officer",
      sub: "Trade & Licensing",
      phone: "254700000108",
      twoFA: true,
    },
    ins01: {
      id: "ins01",
      name: "Faith Wanjiru",
      role: "inspector",
      password: "Inspector@2026",
      avatar: "FW",
      badge: "Inspector / Field Officer",
      sub: "Environmental Health",
      phone: "254700000109",
      twoFA: true,
    },
    off01: {
      id: "off01",
      name: "Grace Ochieng",
      role: "officer",
      password: "Officer@2026",
      avatar: "GO",
      badge: "Revenue Officer",
      sub: "Kisumu Central",
      phone: "254700000110",
      twoFA: true,
    },
    gis01: {
      id: "gis01",
      name: "Robert Kiplagat",
      role: "gisofficer",
      password: "GIS@2026",
      avatar: "RK",
      badge: "GIS Officer",
      sub: "Lands & Physical Planning",
      phone: "254700000111",
      twoFA: true,
    },
    leg01: {
      id: "leg01",
      name: "Vincent Otieno",
      role: "legal",
      password: "Legal@2026",
      avatar: "VO",
      badge: "Legal Liaison",
      sub: "County Attorney's Office",
      phone: "254700000112",
      twoFA: true,
    },
    cash01: {
      id: "cash01",
      name: "Samuel Kiprotich",
      role: "cashier",
      password: "Cashier@2026",
      avatar: "SK",
      badge: "Collections Agent",
      sub: "City Hall Counter",
      phone: "254700000113",
      twoFA: true,
    },
    enf01: {
      id: "enf01",
      name: "Daniel Omondi",
      role: "enforcer",
      password: "Enforce@2026",
      avatar: "DO",
      badge: "Enforcement Officer",
      sub: "Kisumu Central",
      phone: "254700000114",
      twoFA: true,
    },
    aud01: {
      id: "aud01",
      name: "Ann Waithira",
      role: "auditor",
      password: "Auditor@2026",
      avatar: "AW",
      badge: "Auditor",
      sub: "All (Read-Only)",
      phone: "254700000115",
      twoFA: true,
    },
    pay01: {
      id: "pay01",
      name: "Joshua Odhiambo",
      role: "payer",
      password: "Payer@2026",
      avatar: "JO",
      badge: "Citizen / Business Payer",
      sub: "KY-88314",
      phone: "254700000116",
      twoFA: true,
    },
  }).map(([id, user]) => [id, normalizeAuthUser({ ...user, id })])
);

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify(
        {
          sessions: {},
          ledger: [],
          audit: [],
          otp: [],
          notifications: [],
          paymentEvents: [],
          appState: null,
          authChallenges: [],
        },
        null,
        2
      )
    );
  }
}

function defaultStore() {
  return {
    sessions: {},
    ledger: [],
    audit: [],
    otp: [],
    notifications: [],
    paymentEvents: [],
    appState: null,
    authChallenges: [],
  };
}

function normalizeStore(store) {
  const normalized = {
    ...defaultStore(),
    ...(store || {}),
  };
  if (!normalized.sessions || typeof normalized.sessions !== "object") normalized.sessions = {};
  if (!Array.isArray(normalized.ledger)) normalized.ledger = [];
  if (!Array.isArray(normalized.audit)) normalized.audit = [];
  if (!Array.isArray(normalized.otp)) normalized.otp = [];
  if (!Array.isArray(normalized.notifications)) normalized.notifications = [];
  if (!Array.isArray(normalized.paymentEvents)) normalized.paymentEvents = [];
  if (!Array.isArray(normalized.authChallenges)) normalized.authChallenges = [];
  if (!Object.prototype.hasOwnProperty.call(normalized, "appState")) normalized.appState = null;
  return normalized;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function toRecordPayload(item) {
  return cloneJson(item);
}

async function readStore() {
  if (prisma) {
    const [
      sessionRows,
      ledgerRows,
      auditRows,
      otpRows,
      notificationRows,
      paymentEventRows,
      authChallengeRows,
      appStateRow,
    ] = await Promise.all([
      prisma.sessionRecord.findMany(),
      prisma.ledgerRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.auditRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.otpRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.notificationRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.paymentEventRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.authChallengeRecord.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.appStateRecord.findUnique({ where: { id: 1 } }),
    ]);

    return normalizeStore({
      sessions: Object.fromEntries(sessionRows.map((row) => [row.token, row.payload || {}])),
      ledger: ledgerRows.map((row) => row.payload || {}),
      audit: auditRows.map((row) => row.payload || {}),
      otp: otpRows.map((row) => row.payload || {}),
      notifications: notificationRows.map((row) => row.payload || {}),
      paymentEvents: paymentEventRows.map((row) => row.payload || {}),
      authChallenges: authChallengeRows.map((row) => row.payload || {}),
      appState: appStateRow ? appStateRow.payload || null : null,
    });
  }

  ensureStore();
  return normalizeStore(JSON.parse(fs.readFileSync(STORE_FILE, "utf8")));
}

async function writeStore(store) {
  const normalized = normalizeStore(store);
  if (normalized.appState && typeof normalized.appState === "object") {
    normalized.appState.CENTRAL_LEDGER = cloneJson(normalized.ledger || []);
    normalized.appState.AUDIT_LOG = cloneJson(normalized.audit || []);
  }

  if (prisma) {
    await prisma.$transaction([
      prisma.sessionRecord.deleteMany({}),
      prisma.ledgerRecord.deleteMany({}),
      prisma.auditRecord.deleteMany({}),
      prisma.otpRecord.deleteMany({}),
      prisma.notificationRecord.deleteMany({}),
      prisma.paymentEventRecord.deleteMany({}),
      prisma.authChallengeRecord.deleteMany({}),
      prisma.appStateRecord.upsert({
        where: { id: 1 },
        create: { id: 1, payload: normalized.appState },
        update: { payload: normalized.appState },
      }),
      ...(normalized.sessions && Object.keys(normalized.sessions).length
        ? Object.entries(normalized.sessions).map(([token, payload]) =>
            prisma.sessionRecord.create({
              data: { token, payload: toRecordPayload(payload) },
            })
          )
        : []),
      ...(normalized.ledger && normalized.ledger.length
        ? normalized.ledger.map((entry) =>
            prisma.ledgerRecord.create({
              data: { ledgerId: String(entry.ledgerId || entry.id || `LG-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
      ...(normalized.audit && normalized.audit.length
        ? normalized.audit.map((entry) =>
            prisma.auditRecord.create({
              data: { id: String(entry.id || `AUD-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
      ...(normalized.otp && normalized.otp.length
        ? normalized.otp.map((entry) =>
            prisma.otpRecord.create({
              data: { id: String(entry.id || `OTP-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
      ...(normalized.notifications && normalized.notifications.length
        ? normalized.notifications.map((entry) =>
            prisma.notificationRecord.create({
              data: { id: String(entry.id || `NTF-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
      ...(normalized.paymentEvents && normalized.paymentEvents.length
        ? normalized.paymentEvents.map((entry) =>
            prisma.paymentEventRecord.create({
              data: { id: String(entry.id || `PAY-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
      ...(normalized.authChallenges && normalized.authChallenges.length
        ? normalized.authChallenges.map((entry) =>
            prisma.authChallengeRecord.create({
              data: { challengeId: String(entry.challengeId || `AUTH-${crypto.randomUUID().slice(0, 8)}`), payload: toRecordPayload(entry) },
            })
          )
        : []),
    ]);
    return;
  }

  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify(normalized, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

function methodNotAllowed(res) {
  sendJson(res, 405, {
    error: "Hard delete and destructive operations are forbidden by policy",
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  return token;
}

function getSession(req, store) {
  const token = getToken(req);
  if (!token) return null;
  return store.sessions[token] || null;
}

function requireSession(req, res, store) {
  const session = getSession(req, store);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

function requirePermission(req, res, store, permission) {
  const session = requireSession(req, res, store);
  if (!session) return null;
  const permissions = new Set(session.user.permissions || []);
  if (!permissions.has(permission)) {
    sendJson(res, 403, { error: `Forbidden: missing scope ${permission}` });
    return null;
  }
  return session;
}

function callbackTokenFromRequest(req) {
  const headerToken = req.headers["x-callback-token"];
  if (headerToken) return String(headerToken);
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");
  if (type === "Bearer" && token) return token;
  return "";
}

function verifyCallbackToken(req, expectedToken) {
  const provided = callbackTokenFromRequest(req);
  if (!provided || !expectedToken) return false;
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function requestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwarded) return forwarded;
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
}

function addAudit(store, actor, action, module, details, ipAddress) {
  store.audit.unshift({
    id: `AUD-${String(store.audit.length + 1).padStart(8, "0")}`,
    timestamp: new Date().toISOString(),
    actor: actor || "System",
    action,
    module,
    details,
    ipAddress: ipAddress || "unknown",
  });
}

function toSessionUser(user) {
  const source = user || {};
  const rolePolicy = RBAC_ROLES[source.role] || RBAC_ROLES.payer;
  return {
    id: source.id,
    name: source.name,
    role: source.role,
    avatar: source.avatar || "",
    badge: source.badge || "",
    sub: source.sub || "",
    phone: source.phone || "",
    twoFA: Boolean(source.twoFA),
    department: source.department || rolePolicy.department || "",
    permissions: Array.isArray(source.permissions) ? source.permissions : (rolePolicy.permissions || []),
    scopes: Array.isArray(source.scopes) ? source.scopes : (rolePolicy.scopes || []),
    pages: Array.isArray(source.pages) ? source.pages : (rolePolicy.pages || []),
    canCreate: Array.isArray(source.canCreate) ? source.canCreate : (rolePolicy.canCreate || []),
    roleLabel: source.roleLabel || rolePolicy.label || source.badge || source.role,
  };
}

function createSession(store, user, ipAddress) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const sessionUser = toSessionUser(user);
  const session = {
    token,
    user: sessionUser,
    createdAt: now,
    updatedAt: now,
  };
  store.sessions[token] = session;
  addAudit(
    store,
    session.user.name,
    "User login",
    "Access Control",
    `${session.user.role} session established`,
    ipAddress
  );
  return session;
}

function createSessionFromAuthUser(store, authUser, ipAddress) {
  return createSession(store, authUser, ipAddress);
}

function parseLedgerEntry(payload, actorName) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Ledger payload must be an object");
  }
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Ledger amount must be a non-negative number");
  }
  const now = new Date().toISOString();
  return {
    ledgerId: payload.ledgerId || `LG-${crypto.randomUUID().slice(0, 8)}`,
    timestamp: payload.timestamp || now,
    module: String(payload.module || "Unknown"),
    refId: String(payload.refId || "N/A"),
    description: String(payload.description || ""),
    amount,
    method: String(payload.method || "—"),
    payer: String(payload.payer || "—"),
    recordedBy: String(payload.recordedBy || actorName || "System"),
  };
}

async function httpJsonRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = { raw: text };
      }
    }
    if (!response.ok) {
      throw new Error(
        `Provider HTTP ${response.status}${data && data.error ? `: ${data.error}` : ""}`
      );
    }
    return data || {};
  } finally {
    clearTimeout(timer);
  }
}

function validateLiveConfig(mode, required, providerName) {
  if (mode !== "live") return;
  const missing = required.filter((item) => !item.value);
  if (missing.length > 0) {
    const keys = missing.map((item) => item.key).join(", ");
    throw new Error(`${providerName} live mode misconfigured: missing ${keys}`);
  }
}

function maskPhone(phone) {
  const value = String(phone || "");
  if (value.length < 4) return value;
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

async function requestMpesaStkPush(payload) {
  validateLiveConfig(
    CONFIG.mpesa.mode,
    [
      { key: "MPESA_BASE_URL", value: CONFIG.mpesa.baseUrl },
      { key: "MPESA_AUTH_URL", value: CONFIG.mpesa.authUrl },
      { key: "MPESA_CONSUMER_KEY", value: CONFIG.mpesa.consumerKey },
      { key: "MPESA_CONSUMER_SECRET", value: CONFIG.mpesa.consumerSecret },
      { key: "MPESA_SHORTCODE", value: CONFIG.mpesa.shortcode },
      { key: "MPESA_PASSKEY", value: CONFIG.mpesa.passkey },
    ],
    "M-Pesa"
  );

  if (CONFIG.mpesa.mode === "mock") {
    return {
      mode: "mock",
      CheckoutRequestID: `ws_CO_${crypto.randomUUID().slice(0, 12)}`,
      MerchantRequestID: `MR_${crypto.randomUUID().slice(0, 8)}`,
      ResponseCode: "0",
      ResponseDescription: "Mock STK push accepted",
      CustomerMessage: "Success. Request accepted for processing",
    };
  }

  const authHeader = Buffer.from(
    `${CONFIG.mpesa.consumerKey}:${CONFIG.mpesa.consumerSecret}`
  ).toString("base64");
  const auth = await httpJsonRequest(CONFIG.mpesa.authUrl, {
    headers: { Authorization: `Basic ${authHeader}` },
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const password = Buffer.from(
    `${CONFIG.mpesa.shortcode}${CONFIG.mpesa.passkey}${timestamp}`
  ).toString("base64");
  const requestBody = {
    BusinessShortCode: CONFIG.mpesa.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: payload.amount,
    PartyA: payload.phoneNumber,
    PartyB: CONFIG.mpesa.shortcode,
    PhoneNumber: payload.phoneNumber,
    CallBackURL: CONFIG.mpesa.callbackUrl,
    AccountReference: payload.accountReference,
    TransactionDesc: payload.transactionDesc,
  };

  return httpJsonRequest(`${CONFIG.mpesa.baseUrl}${CONFIG.mpesa.stkPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
      "Content-Type": "application/json",
    },
    body: requestBody,
  });
}

async function requestCoopCollection(payload) {
  validateLiveConfig(
    CONFIG.coop.mode,
    [
      { key: "COOPBANK_BASE_URL", value: CONFIG.coop.baseUrl },
      { key: "COOPBANK_TOKEN_URL", value: CONFIG.coop.tokenUrl },
      { key: "COOPBANK_CLIENT_ID", value: CONFIG.coop.clientId },
      { key: "COOPBANK_CLIENT_SECRET", value: CONFIG.coop.clientSecret },
    ],
    "Coop Bank"
  );

  if (CONFIG.coop.mode === "mock") {
    return {
      mode: "mock",
      status: "accepted",
      transactionId: `COOP-${crypto.randomUUID().slice(0, 10)}`,
      message: "Mock Coop Bank collection request accepted",
    };
  }

  const auth = await httpJsonRequest(CONFIG.coop.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      clientId: CONFIG.coop.clientId,
      clientSecret: CONFIG.coop.clientSecret,
    },
  });

  return httpJsonRequest(`${CONFIG.coop.baseUrl}${CONFIG.coop.collectionPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
      "Content-Type": "application/json",
    },
    body: payload,
  });
}

async function sendOtpNotification(payload) {
  validateLiveConfig(
    CONFIG.notifications.mode,
    [
      { key: "NOTIFY_BASE_URL", value: CONFIG.notifications.baseUrl },
      { key: "NOTIFY_API_KEY", value: CONFIG.notifications.apiKey },
    ],
    "Notification provider"
  );

  if (CONFIG.notifications.mode === "mock") {
    return {
      mode: "mock",
      providerMessageId: `OTP-${crypto.randomUUID().slice(0, 10)}`,
      status: "queued",
    };
  }

  return httpJsonRequest(
    `${CONFIG.notifications.baseUrl}${CONFIG.notifications.otpPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.notifications.apiKey}`,
        "Content-Type": "application/json",
      },
      body: payload,
    }
  );
}

async function sendTransactionNotification(payload) {
  validateLiveConfig(
    CONFIG.notifications.mode,
    [
      { key: "NOTIFY_BASE_URL", value: CONFIG.notifications.baseUrl },
      { key: "NOTIFY_API_KEY", value: CONFIG.notifications.apiKey },
    ],
    "Notification provider"
  );

  if (CONFIG.notifications.mode === "mock") {
    return {
      mode: "mock",
      providerMessageId: `TRX-${crypto.randomUUID().slice(0, 10)}`,
      status: "queued",
    };
  }

  return httpJsonRequest(
    `${CONFIG.notifications.baseUrl}${CONFIG.notifications.transactionPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.notifications.apiKey}`,
        "Content-Type": "application/json",
      },
      body: payload,
    }
  );
}

function parseMpesaCallback(payload) {
  const callback = payload?.Body?.stkCallback || payload?.stkCallback || {};
  const metadataItems = callback.CallbackMetadata?.Item || [];
  const metadataMap = metadataItems.reduce((acc, item) => {
    if (item?.Name) acc[item.Name] = item.Value;
    return acc;
  }, {});
  const amount = Number(metadataMap.Amount || callback.Amount || payload.amount || 0);
  return {
    resultCode: Number(callback.ResultCode ?? payload.ResultCode ?? payload.resultCode ?? -1),
    resultDesc: String(
      callback.ResultDesc || payload.ResultDesc || payload.resultDesc || "Unknown callback"
    ),
    checkoutRequestId: String(
      callback.CheckoutRequestID ||
        payload.CheckoutRequestID ||
        payload.checkoutRequestId ||
        ""
    ),
    merchantRequestId: String(
      callback.MerchantRequestID || payload.MerchantRequestID || payload.merchantRequestId || ""
    ),
    amount: Number.isFinite(amount) ? amount : 0,
    mpesaReceipt: String(
      metadataMap.MpesaReceiptNumber || payload.MpesaReceiptNumber || payload.receipt || ""
    ),
    phoneNumber: String(metadataMap.PhoneNumber || payload.PhoneNumber || payload.phoneNumber || ""),
    reference: String(
      metadataMap.AccountReference || payload.AccountReference || payload.reference || ""
    ),
  };
}

async function handleApi(req, res, url) {
  if (req.method === "DELETE") {
    methodNotAllowed(res);
    return;
  }

  const store = await readStore();

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      service: "countycore-backend",
      timestamp: new Date().toISOString(),
      sessions: Object.keys(store.sessions).length,
      ledgerEntries: store.ledger.length,
      authChallenges: store.authChallenges.length,
      integrations: {
        mpesaMode: CONFIG.mpesa.mode,
        coopbankMode: CONFIG.coop.mode,
        notificationsMode: CONFIG.notifications.mode,
      },
    });
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const identifier = String(body.userId || body.username || body.user || "").trim();
      const password = String(body.password || "");
      if (!identifier || !password) {
        sendJson(res, 400, { error: "userId and password are required" });
        return;
      }

      const authUser = AUTH_USERS[identifier] || Object.values(AUTH_USERS).find((entry) => entry.id === identifier || entry.name === identifier || entry.id.toLowerCase() === identifier.toLowerCase());
      const passwordHash = hashSecret(password);
      const validPassword = authUser && (authUser.passwordHash === passwordHash || authUser.password === password);
      if (!authUser || !validPassword) {
        sendJson(res, 401, { error: "Invalid credentials" });
        return;
      }

      if (!authUser.twoFA) {
        const session = createSessionFromAuthUser(store, authUser, requestIp(req));
        await writeStore(store);
        sendJson(res, 200, { token: session.token, user: session.user, requiresOtp: false });
        return;
      }

      const challengeId = `AUTH-${crypto.randomUUID().slice(0, 12)}`;
      const otpCode = generateOtpCode();
      const expiresAt = new Date(
        Date.now() + CONFIG.notifications.otpTtlSeconds * 1000
      ).toISOString();
      const recipient = authUser.phone;
      const message = `Your CountyCore login OTP is ${otpCode}. It expires in ${CONFIG.notifications.otpTtlSeconds} seconds.`;
      const provider = await sendOtpNotification({
        channel: "sms",
        recipient,
        message,
        senderId: CONFIG.notifications.senderId,
      });

      store.authChallenges.unshift({
        challengeId,
        userId: authUser.id,
        otpHash: hashOtp(otpCode),
        expiresAt,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        providerMessageId: provider.providerMessageId || provider.messageId || null,
      });
      store.notifications.unshift({
        id: `NTF-${crypto.randomUUID().slice(0, 10)}`,
        type: "otp-login",
        recipient,
        channel: "sms",
        purpose: "login",
        status: provider.status || "queued",
        provider,
        timestamp: new Date().toISOString(),
      });
      addAudit(
        store,
        authUser.name,
        "Login OTP issued",
        "Access Control",
        `OTP issued to ${maskPhone(recipient)}`,
        requestIp(req)
      );
      await writeStore(store);

      sendJson(res, 200, {
        requiresOtp: true,
        challengeId,
        maskedRecipient: maskPhone(recipient),
        expiresAt,
        debugCode: CONFIG.notifications.mode === "mock" ? otpCode : undefined,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/auth/otp/verify" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const challengeId = String(body.challengeId || "").trim();
      const otpCode = String(body.code || "").trim();
      if (!challengeId || !otpCode) {
        sendJson(res, 400, { error: "challengeId and code are required" });
        return;
      }

      const challenge = store.authChallenges.find(
        (item) => item.challengeId === challengeId && !item.verifiedAt
      );
      if (!challenge) {
        sendJson(res, 400, { error: "Invalid or expired challenge" });
        return;
      }
      if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
        sendJson(res, 400, { error: "OTP challenge expired" });
        return;
      }
      if (challenge.otpHash !== hashOtp(otpCode)) {
        sendJson(res, 400, { error: "Invalid OTP code" });
        return;
      }

      const user = AUTH_USERS[challenge.userId];
      if (!user) {
        sendJson(res, 400, { error: "User no longer available for this challenge" });
        return;
      }
      challenge.verifiedAt = new Date().toISOString();
      const session = createSessionFromAuthUser(store, user, requestIp(req));
      addAudit(
        store,
        user.name,
        "Login OTP verified",
        "Access Control",
        `OTP challenge ${challengeId} verified`,
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 200, {
        token: session.token,
        user: session.user,
        requiresOtp: false,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/rbac/roles" && req.method === "GET") {
    sendJson(res, 200, {
      roles: RBAC_ROLES,
      moduleRoles: {},
    });
    return;
  }

  if (url.pathname === "/api/session/login" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      if (!body.user || !body.user.id || !body.user.name || !body.user.role) {
        sendJson(res, 400, {
          error: "user.id, user.name, and user.role are required",
        });
        return;
      }
      const session = createSession(store, body.user, requestIp(req));
      await writeStore(store);
      sendJson(res, 200, {
        token: session.token,
        user: session.user,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/session" && req.method === "GET") {
    const session = requireSession(req, res, store);
    if (!session) return;
    sendJson(res, 200, {
      user: session.user,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
    return;
  }

  if (url.pathname === "/api/session/logout" && req.method === "POST") {
    const token = getToken(req);
    if (!token || !store.sessions[token]) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    const actor = store.sessions[token].user.name;
    delete store.sessions[token];
    addAudit(store, actor, "User logout", "Access Control", "Session terminated", requestIp(req));
    await writeStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/ledger" && req.method === "GET") {
    const session = requirePermission(req, res, store, "ledger:read");
    if (!session) return;
    sendJson(res, 200, { entries: store.ledger });
    return;
  }

  if (url.pathname === "/api/ledger" && req.method === "POST") {
    const session = requirePermission(req, res, store, "ledger:write");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      const entry = parseLedgerEntry(body.entry, session.user.name);
      store.ledger.unshift(entry);
      addAudit(
        store,
        session.user.name,
        "Payment recorded",
        entry.module,
        `${entry.description} — KES ${entry.amount.toLocaleString()} (${entry.refId})`,
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 201, { entry });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/audit" && req.method === "GET") {
    const session = requirePermission(req, res, store, "audit:read");
    if (!session) return;
    sendJson(res, 200, { entries: store.audit });
    return;
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    const session = requirePermission(req, res, store, "state:read");
    if (!session) return;
    sendJson(res, 200, { state: store.appState });
    return;
  }

  if (url.pathname === "/api/state" && req.method === "PUT") {
    const session = requirePermission(req, res, store, "state:write");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
        sendJson(res, 400, { error: "state must be an object" });
        return;
      }
      store.appState = body.state;
      addAudit(
        store,
        session.user.name,
        "Business state synchronized",
        "State Sync",
        "Frontend process state synced to backend",
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 200, { ok: true, updatedAt: new Date().toISOString() });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/integrations/mpesa/stk-push" && req.method === "POST") {
    const session = requirePermission(req, res, store, "payments:receive");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(res, 400, { error: "amount must be a positive number" });
        return;
      }
      if (!body.phoneNumber || !body.accountReference) {
        sendJson(res, 400, { error: "phoneNumber and accountReference are required" });
        return;
      }
      const providerResponse = await requestMpesaStkPush({
        amount,
        phoneNumber: String(body.phoneNumber),
        accountReference: String(body.accountReference),
        transactionDesc: String(body.transactionDesc || "CountyCore payment"),
      });
      const event = {
        id: `EVT-${crypto.randomUUID().slice(0, 10)}`,
        provider: "mpesa",
        type: "stk_push_request",
        status: "pending",
        initiatedBy: session.user.name,
        reference: String(body.accountReference),
        amount,
        response: providerResponse,
        timestamp: new Date().toISOString(),
      };
      store.paymentEvents.unshift(event);
      addAudit(
        store,
        session.user.name,
        "M-Pesa STK push initiated",
        "Payments",
        `Reference ${event.reference} for KES ${amount.toLocaleString()}`,
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 202, { event });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/webhooks/mpesa" && req.method === "POST") {
    if (!verifyCallbackToken(req, CONFIG.mpesa.callbackToken)) {
      sendJson(res, 401, { error: "Invalid callback token" });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const callback = parseMpesaCallback(body);
      const success = callback.resultCode === 0;
      store.paymentEvents.unshift({
        id: `EVT-${crypto.randomUUID().slice(0, 10)}`,
        provider: "mpesa",
        type: "callback",
        status: success ? "success" : "failed",
        reference: callback.reference || callback.checkoutRequestId || "N/A",
        amount: callback.amount,
        response: callback,
        timestamp: new Date().toISOString(),
      });

      if (success) {
        const entry = parseLedgerEntry(
          {
            module: "Payments",
            refId: callback.mpesaReceipt || callback.checkoutRequestId || "M-PESA",
            description: `M-Pesa payment callback (${callback.reference || "no reference"})`,
            amount: callback.amount,
            method: "M-Pesa",
            payer: callback.phoneNumber || "—",
            recordedBy: "M-Pesa Webhook",
          },
          "M-Pesa Webhook"
        );
        store.ledger.unshift(entry);
        addAudit(
          store,
          "M-Pesa Webhook",
          "M-Pesa callback received",
          "Payments",
          `Successful callback posted to ledger: ${entry.refId}`,
          requestIp(req)
        );
      } else {
        addAudit(
          store,
          "M-Pesa Webhook",
          "M-Pesa callback received",
          "Payments",
          `Failed callback: ${callback.resultDesc}`,
          requestIp(req)
        );
      }

      await writeStore(store);
      sendJson(res, 200, { ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/integrations/coopbank/collection" && req.method === "POST") {
    const session = requirePermission(req, res, store, "payments:receive");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(res, 400, { error: "amount must be a positive number" });
        return;
      }
      if (!body.reference || !body.accountNumber) {
        sendJson(res, 400, { error: "reference and accountNumber are required" });
        return;
      }
      const providerResponse = await requestCoopCollection({
        amount,
        reference: String(body.reference),
        accountNumber: String(body.accountNumber),
        payerName: String(body.payerName || ""),
        narration: String(body.narration || "CountyCore collection"),
      });
      const event = {
        id: `EVT-${crypto.randomUUID().slice(0, 10)}`,
        provider: "coopbank",
        type: "collection_request",
        status: "pending",
        initiatedBy: session.user.name,
        reference: String(body.reference),
        amount,
        response: providerResponse,
        timestamp: new Date().toISOString(),
      };
      store.paymentEvents.unshift(event);
      addAudit(
        store,
        session.user.name,
        "Coop Bank collection initiated",
        "Payments",
        `Reference ${event.reference} for KES ${amount.toLocaleString()}`,
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 202, { event });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/webhooks/coopbank" && req.method === "POST") {
    if (!verifyCallbackToken(req, CONFIG.coop.callbackToken)) {
      sendJson(res, 401, { error: "Invalid callback token" });
      return;
    }
    try {
      const body = await parseJsonBody(req);
      const status = String(body.status || "").toLowerCase();
      const success = status === "success" || status === "completed";
      const amount = Number(body.amount || 0);
      const reference = String(body.reference || body.transactionId || "N/A");
      store.paymentEvents.unshift({
        id: `EVT-${crypto.randomUUID().slice(0, 10)}`,
        provider: "coopbank",
        type: "callback",
        status: success ? "success" : "failed",
        reference,
        amount: Number.isFinite(amount) ? amount : 0,
        response: body,
        timestamp: new Date().toISOString(),
      });

      if (success) {
        const entry = parseLedgerEntry(
          {
            module: "Payments",
            refId: reference,
            description: `Coop Bank callback payment (${reference})`,
            amount: Number.isFinite(amount) ? amount : 0,
            method: "Coop Bank",
            payer: String(body.accountNumber || body.payerName || "—"),
            recordedBy: "Coop Bank Webhook",
          },
          "Coop Bank Webhook"
        );
        store.ledger.unshift(entry);
        addAudit(
          store,
          "Coop Bank Webhook",
          "Coop callback received",
          "Payments",
          `Successful callback posted to ledger: ${entry.refId}`,
          requestIp(req)
        );
      } else {
        addAudit(
          store,
          "Coop Bank Webhook",
          "Coop callback received",
          "Payments",
          `Failed callback for reference ${reference}`,
          requestIp(req)
        );
      }

      await writeStore(store);
      sendJson(res, 200, { acknowledged: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/notifications/otp/send" && req.method === "POST") {
    const session = requirePermission(req, res, store, "notifications:send");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      const recipient = String(body.recipient || "").trim();
      const purpose = String(body.purpose || "").trim();
      const channel = String(body.channel || "sms");
      if (!recipient || !purpose) {
        sendJson(res, 400, { error: "recipient and purpose are required" });
        return;
      }

      const otpCode = generateOtpCode();
      const otpId = `OTP-${crypto.randomUUID().slice(0, 10)}`;
      const expiresAt = new Date(
        Date.now() + CONFIG.notifications.otpTtlSeconds * 1000
      ).toISOString();
      const message = `Your CountyCore OTP is ${otpCode}. It expires in ${CONFIG.notifications.otpTtlSeconds} seconds.`;

      const provider = await sendOtpNotification({
        channel,
        recipient,
        message,
        senderId: CONFIG.notifications.senderId,
      });

      store.otp.unshift({
        otpId,
        recipient,
        purpose,
        channel,
        codeHash: hashOtp(otpCode),
        expiresAt,
        createdAt: new Date().toISOString(),
        verifiedAt: null,
        providerMessageId: provider.providerMessageId || provider.messageId || null,
      });
      store.notifications.unshift({
        id: `NTF-${crypto.randomUUID().slice(0, 10)}`,
        type: "otp",
        recipient,
        channel,
        purpose,
        status: provider.status || "queued",
        provider,
        timestamp: new Date().toISOString(),
      });
      addAudit(
        store,
        session.user.name,
        "OTP sent",
        "Notifications",
        `OTP sent to ${recipient} for ${purpose}`,
        requestIp(req)
      );
      await writeStore(store);

      sendJson(res, 200, {
        otpId,
        recipient,
        channel,
        expiresAt,
        providerStatus: provider.status || "queued",
        debugCode: CONFIG.notifications.mode === "mock" ? otpCode : undefined,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/notifications/otp/verify" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const recipient = String(body.recipient || "").trim();
      const purpose = String(body.purpose || "").trim();
      const code = String(body.code || "").trim();
      if (!recipient || !purpose || !code) {
        sendJson(res, 400, { error: "recipient, purpose, and code are required" });
        return;
      }

      const nowMs = Date.now();
      const otp = store.otp.find(
        (item) =>
          item.recipient === recipient &&
          item.purpose === purpose &&
          !item.verifiedAt &&
          new Date(item.expiresAt).getTime() > nowMs
      );
      if (!otp) {
        sendJson(res, 400, { error: "OTP not found or expired" });
        return;
      }
      if (otp.codeHash !== hashOtp(code)) {
        sendJson(res, 400, { error: "Invalid OTP code" });
        return;
      }

      otp.verifiedAt = new Date().toISOString();
      addAudit(store, "System", "OTP verified", "Notifications", `OTP verified for ${recipient}`, requestIp(req));
      await writeStore(store);
      sendJson(res, 200, { ok: true, otpId: otp.otpId, verifiedAt: otp.verifiedAt });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/notifications/transaction" && req.method === "POST") {
    const session = requirePermission(req, res, store, "notifications:send");
    if (!session) return;
    try {
      const body = await parseJsonBody(req);
      const recipient = String(body.recipient || "").trim();
      const channel = String(body.channel || "sms");
      const reference = String(body.reference || "").trim();
      const amount = Number(body.amount);
      if (!recipient || !reference || !Number.isFinite(amount)) {
        sendJson(res, 400, {
          error: "recipient, reference, and numeric amount are required",
        });
        return;
      }

      const message =
        body.message ||
        `CountyCore payment confirmed. Ref ${reference}, amount KES ${amount.toLocaleString()}.`;
      const provider = await sendTransactionNotification({
        channel,
        recipient,
        message,
        senderId: CONFIG.notifications.senderId,
      });
      store.notifications.unshift({
        id: `NTF-${crypto.randomUUID().slice(0, 10)}`,
        type: "transaction",
        recipient,
        channel,
        reference,
        amount,
        status: provider.status || "queued",
        provider,
        timestamp: new Date().toISOString(),
      });
      addAudit(
        store,
        session.user.name,
        "Transaction notification sent",
        "Notifications",
        `Ref ${reference} sent to ${recipient}`,
        requestIp(req)
      );
      await writeStore(store);
      sendJson(res, 200, {
        ok: true,
        recipient,
        reference,
        providerStatus: provider.status || "queued",
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  notFound(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method === "DELETE") {
      methodNotAllowed(res);
      return;
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/countycore_v9.html" ||
      url.pathname === "/countycore_v8.html"
    ) {
      const html = fs.readFileSync(FRONTEND_FILE, "utf8");
      sendText(res, 200, html, "text/html; charset=utf-8");
      return;
    }

    sendText(res, 404, "Not found");
  } catch (error) {
    sendJson(res, 500, { error: "Internal server error", detail: error.message });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`CountyCore server running on http://${HOST}:${PORT}`);
});
