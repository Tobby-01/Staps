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
```

## Paystack Notes

- STAPS currently uses Paystack's server-driven redirect flow for transaction initialization and verification.
- `server/.env` must contain a valid `PAYSTACK_SECRET_KEY=sk_test_...` or `sk_live_...` for payments to work.
- A `pk_test_...` public key is optional for future inline popup checkout, but it does not replace the secret key used by the backend.
- The vendor registration fee is set to `NGN 1,000` in the current test configuration and can be changed later through `VENDOR_REGISTRATION_FEE`.

## Deployment

Recommended setup:

- Frontend: Vercel
- Backend API: Koyeb
- Database: MongoDB Atlas

### Backend on Koyeb

1. Push this repo to GitHub.
2. In Koyeb, create a new Web Service from this repo.
3. Set the service work directory to `server`.
4. Use the buildpack flow and run command `npm run start`.
5. Expose port `5000` as HTTP and set the health check path to `/api/health`.
6. Add production environment variables based on `server/.env.koyeb.example`.

Important production values:

- `CLIENT_URL=https://your-frontend.vercel.app`
  You can also include multiple origins separated by commas, for example:
  `CLIENT_URL=https://your-frontend.vercel.app,https://your-preview.vercel.app`
  STAPS uses the first non-localhost value in this list for email links and Paystack redirects.
- `SERVER_URL=https://your-koyeb-service-domain`
- `MONGODB_URI=<your-mongodb-atlas-uri>`
- `JWT_SECRET=<strong-random-secret>`
- `PAYSTACK_CALLBACK_URL=https://your-frontend.vercel.app/payment/callback`
- Optional Cloudflare R2 storage for product uploads:
  `CLOUDFLARE_R2_ACCOUNT_ID=<your-cloudflare-account-id>`,
  `CLOUDFLARE_R2_ACCESS_KEY_ID=<your-r2-access-key-id>`,
  `CLOUDFLARE_R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>`,
  `CLOUDFLARE_R2_BUCKET_NAME=<your-r2-bucket-name>`,
  `CLOUDFLARE_R2_PUBLIC_BASE_URL=https://pub-your-bucket-id.r2.dev`
- Optional Cloudflare Images storage for avatars, review images, and vendor documents:
  `CLOUDFLARE_IMAGES_ACCOUNT_ID=<your-cloudflare-account-id>`,
  `CLOUDFLARE_IMAGES_API_TOKEN=<your-cloudflare-images-token>`,
  `CLOUDFLARE_IMAGES_VARIANT=public`
- Optional SMTP safety timeouts:
  `SMTP_CONNECTION_TIMEOUT_MS=10000`, `SMTP_GREETING_TIMEOUT_MS=10000`, `SMTP_SOCKET_TIMEOUT_MS=15000`

Production email note:

- Do not use a freemail sender such as `gmail.com`, `yahoo.com`, or `outlook.com` for live STAPS notifications.
- Set `MAIL_FROM` to a mailbox on your own domain, for example `STAPS <hello@yourdomain.com>`.
- Authenticate that domain in your email provider with SPF, DKIM, and a DMARC policy before sending at scale.
- `SMTP_USER` should come from the same authenticated domain or from your transactional email provider credentials.
- Gmail SMTP can still be useful for local testing, but it is not a good production sender identity for current Google, Yahoo, and Microsoft deliverability requirements.

### Frontend on Vercel

1. Create a new Vercel project from the same GitHub repo.
2. Set the project root directory to `client`.
3. Add:

```bash
VITE_API_BASE_URL=https://your-koyeb-service-domain
```

4. Deploy the frontend.

### Notes

- Product images can use Cloudflare R2 when the R2 env vars are set. Without that configuration, product uploads fall back to the backend filesystem.
- Avatars, review images, and vendor documents can still use Cloudflare Images when those env vars are set. Without that configuration, they also fall back to the backend filesystem.
- Authentication cookies use secure cross-site settings in production, so both frontend and backend must be served over HTTPS.
- To send the one-time “email delivery is back online” broadcast to all users, run `npm run notify:mailing-restored --workspace server` after confirming SMTP is working.
