# STAPS on Koyeb

This repo is configured for a Koyeb backend deployment while keeping the frontend on Vercel.

## Recommended Layout

- Frontend: Vercel
- Backend API: Koyeb Web Service
- Database: MongoDB Atlas

## Backend Service Setup

1. Push this repo to GitHub.
2. In Koyeb, create a new Web Service from the repo.
3. Use `server` as the service work directory.
4. Use the native buildpack flow.
5. Set the run command to `npm run start`.
   You can also keep the included [server/Procfile](server/Procfile) and let Koyeb use `web: npm run start`.
6. Expose port `5000` as HTTP.
   Koyeb automatically injects the `PORT` environment variable, and the API already reads it.
7. Set the HTTP health check path to `/api/health`.

## Environment Variables

Use [server/.env.koyeb.example](server/.env.koyeb.example) as the Koyeb template.

Important values:

- `NODE_ENV=production`
- `CLIENT_URL=https://your-frontend.vercel.app`
- `SERVER_URL=https://{{ KOYEB_PUBLIC_DOMAIN }}`
- `MONGODB_URI=<your-mongodb-atlas-uri>`
- `JWT_SECRET=<strong-random-secret>`
- `PAYSTACK_CALLBACK_URL=https://your-frontend.vercel.app/payment/callback`
- `CLOUDFLARE_R2_ACCOUNT_ID=<your-cloudflare-account-id>`
- `CLOUDFLARE_R2_ACCESS_KEY_ID=<your-r2-access-key-id>`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>`
- `CLOUDFLARE_R2_BUCKET_NAME=<your-r2-bucket-name>`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL=https://pub-your-bucket-id.r2.dev`
- `CLOUDFLARE_IMAGES_ACCOUNT_ID=<your-cloudflare-account-id>`
- `CLOUDFLARE_IMAGES_API_TOKEN=<your-cloudflare-images-token>`
- `CLOUDFLARE_IMAGES_VARIANT=public`
- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=resend`
- `SMTP_PASS=<your-resend-smtp-password>`
- `MAIL_FROM=STAPS <noreply@yourdomain.com>`
- `SMTP_DEBUG=false`

## Email Notes

- Koyeb services can use outbound SMTP on port `587`, which fits the Resend SMTP setup used by this project.
- Do not use a freemail sender like `gmail.com` for `MAIL_FROM`.
- Resend should send from a verified domain you control, such as `noreply@orexmine.xyz`.

## Frontend

You can keep the frontend on Vercel.

Set:

```bash
VITE_API_BASE_URL=https://your-koyeb-service-domain
```

## Production Reminder

Product images can use Cloudflare R2 when the R2 env vars are set. Without that configuration, product uploads fall back to the backend filesystem.

Shopper avatars, review images, and vendor documents can still use Cloudflare Images when the Cloudflare Images env vars are set. Without that configuration, those uploads also fall back to the backend filesystem.
