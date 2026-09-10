const { emit } = require("../shared/events/eventBus");

const SERVICE_CATALOG = {
  auth: {
    name: "Identity Service",
    owner: "Access & Security",
    dataOwnership: ["users", "roles", "sessions", "otp_challenges"],
    routes: ["/api/auth/login", "/api/auth/otp/verify", "/api/session/login", "/api/session", "/api/session/logout", "/api/rbac/roles"],
    responsibilities: ["authentication", "authorization", "OTP", "session management"],
  },
  customers: {
    name: "Customer Service",
    owner: "Citizen Services",
    dataOwnership: ["customers", "identity_validation"],
    routes: ["/api/customers", "/api/customers/validate"],
    responsibilities: ["customer onboarding", "duplicate detection", "identity checks"],
  },
  ledger: {
    name: "Revenue Service",
    owner: "Finance & Treasury",
    dataOwnership: ["ledger", "invoices", "revenue_streams", "state"],
    routes: ["/api/ledger", "/api/audit", "/api/state", "/api/invoices", "/api/revenue-streams"],
    responsibilities: ["ledger accounting", "revenue posting", "audit trail", "state synchronization"],
  },
  permits: {
    name: "Permit & Compliance Service",
    owner: "Permits & Compliance",
    dataOwnership: ["permit_compliance", "approvals", "waivers"],
    routes: ["/api/permits", "/api/permits/compliance"],
    responsibilities: ["permit lifecycle", "waivers", "approvals", "compliance review"],
  },
  payments: {
    name: "Payment Gateway Service",
    owner: "Payments & Reconciliation",
    dataOwnership: ["payment_events", "gateway_callbacks", "reconciliation"],
    routes: ["/api/integrations/mpesa/stk-push", "/api/webhooks/mpesa", "/api/integrations/coopbank/collection", "/api/webhooks/coopbank"],
    responsibilities: ["M-Pesa flows", "Coop Bank flows", "webhook validation", "reconciliation"],
  },
  notifications: {
    name: "Notification Service",
    owner: "Operations & Messaging",
    dataOwnership: ["otp_notifications", "transaction_notifications"],
    routes: ["/api/notifications/otp/send", "/api/notifications/otp/verify", "/api/notifications/transaction"],
    responsibilities: ["OTP delivery", "transaction alerts", "provider handoff"],
  },
  support: {
    name: "Support Service",
    owner: "Customer Support",
    dataOwnership: ["support_tickets"],
    routes: ["/api/support/tickets"],
    responsibilities: ["support ticket intake", "assignment", "tracking"],
  },
  audit: {
    name: "Audit & Reporting Service",
    owner: "Governance & Assurance",
    dataOwnership: ["audit_log", "reporting"],
    routes: ["/api/audit"],
    responsibilities: ["immutable event log", "reporting", "compliance evidence"],
  },
};

function registerDomainServices() {
  Object.entries(SERVICE_CATALOG).forEach(([key, service]) => {
    emit("service:registered", { key, ...service, architecture: "modular-monolith" });
  });
  return SERVICE_CATALOG;
}

function emitDomainEvent(eventName, payload) {
  return emit(eventName, { eventName, ...payload, architecture: "modular-monolith" });
}

module.exports = {
  SERVICE_CATALOG,
  registerDomainServices,
  emitDomainEvent,
};
