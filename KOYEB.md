# STAPS on Koyeb

This repo is ready to move the backend API from Render to Koyeb while keeping the frontend on Vercel.

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
- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=resend`
- `SMTP_PASS=<your-resend-smtp-password>`
- `MAIL_FROM=STAPS <noreply@yourdomain.com>`
- `SMTP_DEBUG=false`

## Email Notes

- Koyeb free services can use outbound SMTP on port `587`, which is a better fit for Resend SMTP than Render free web services.
- Do not use a freemail sender like `gmail.com` for `MAIL_FROM`.
- Resend should send from a verified domain you control, such as `noreply@orexmine.xyz`.

## Frontend

You can keep the frontend on Vercel.

Set:

```bash
VITE_API_BASE_URL=https://your-koyeb-service-domain
```

## Production Reminder

Uploads are still stored on the backend filesystem, so product images, avatars, and vendor documents should eventually move to persistent object storage for production durability.
