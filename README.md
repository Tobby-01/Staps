# STAPS

STAPS is a campus-focused multi-vendor marketplace built with a React + Tailwind frontend and an Express + MongoDB backend.

## Architecture

- `client/` - React application powered by Vite and Tailwind CSS
- `server/` - Express REST API with modular controllers, services, models, and middleware

## Folder Structure

```text
STAPS/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- lib/
|   |   |-- pages/
|   |   `-- state/
|   |-- index.html
|   `-- tailwind.config.js
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- constants/
|   |   |-- controllers/
|   |   |-- middlewares/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- utils/
|   `-- .env.example
|-- package.json
`-- README.md
```

## Core Features

- JWT authentication with HTTP-only cookies
- Buyer and vendor signup flows
- Internal admin role protected by backend middleware
- Vendor onboarding with registration payment hooks
- Product management and flash sales
- Escrow-aware order lifecycle and timed cancellation window
- Reviews, follows, and in-app notifications

## Internal Admin Account

Admin is not selectable from the UI. Assign it manually in MongoDB, for example:

```json
{
  "email": "stapdevs@gmail.com",
  "role": "admin"
}
```

## Quick Start

1. Install dependencies in both workspaces:

```bash
npm install
```

2. Create `server/.env` from `server/.env.example`
3. Start MongoDB locally on `127.0.0.1:27017` or update `MONGODB_URI` in `server/.env`
4. Start the app:

```bash
npm run dev

## Paystack Notes

- STAPS currently uses Paystack's server-driven redirect flow for transaction initialization and verification.
- `server/.env` must contain a valid `PAYSTACK_SECRET_KEY=sk_test_...` or `sk_live_...` for payments to work.
- A `pk_test_...` public key is optional for future inline popup checkout, but it does not replace the secret key used by the backend.
- The vendor registration fee is set to `NGN 1,000` in the current test configuration and can be changed later through `VENDOR_REGISTRATION_FEE`.
```
