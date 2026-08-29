# CountyCore Backend

Backend host and API layer for [countycore_v10.html](</Users/macbookpro2019/Desktop/Clients/Kisumu/CountyCore - Production/countycore-backend/countycore_v10.html>), with:

- session/auth APIs
- unified ledger APIs
- M-Pesa integration endpoints
- Coop Bank integration endpoints
- OTP + transaction notification APIs
- strict no-delete policy (`DELETE` is blocked globally)

## Run

```bash
npm install
npm start
```

App runs on `http://127.0.0.1:3000` by default.

## Environment

Copy [`.env.example`](</Users/macbookpro2019/Desktop/Clients/Kisumu/CountyCore - Production/countycore-backend/.env.example>) and set values:

- `MPESA_MODE`, `COOPBANK_MODE`, `NOTIFY_MODE`: `mock` or `live`
- In `live` mode, required credentials must be provided.
- Webhooks require callback tokens:
  - `MPESA_CALLBACK_TOKEN`
  - `COOPBANK_CALLBACK_TOKEN`

## API endpoints

### Session and ledger

- `POST /api/auth/login`
- `POST /api/auth/otp/verify`
- `POST /api/session/login`
- `GET /api/session`
- `POST /api/session/logout`
- `GET /api/ledger`
- `POST /api/ledger`
- `GET /api/audit`
- `GET /api/state`
- `PUT /api/state`

State is polled and synchronized by the frontend for auto-updating dashboards and module screens.

### M-Pesa

- `POST /api/integrations/mpesa/stk-push` (auth required)
- `POST /api/webhooks/mpesa` (callback token required)

### Coop Bank

- `POST /api/integrations/coopbank/collection` (auth required)
- `POST /api/webhooks/coopbank` (callback token required)

### Notifications

- `POST /api/notifications/otp/send` (auth required)
- `POST /api/notifications/otp/verify`
- `POST /api/notifications/transaction` (auth required)

### Health

- `GET /api/health`

## No-delete policy

All `DELETE` requests return:

- `405 Method Not Allowed`
- message: `Hard delete and destructive operations are forbidden by policy`

## Tests

```bash
npm test
```

Smoke tests are in [tests/smoke/api.smoke.test.js](</Users/macbookpro2019/Desktop/Clients/Kisumu/CountyCore - Production/countycore-backend/tests/smoke/api.smoke.test.js>).
