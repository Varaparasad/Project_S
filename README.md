# Made-to-order Snacks

Full-stack order-request system for snacks prepared after confirmation. Customers create an order request; an admin receives an email, calls or messages the customer, confirms the advance payment off-site, then updates the order status.

## Stack
- React + Vite + React Query + responsive CSS
- Express + MongoDB/Mongoose + JWT HTTP-only cookies
- Google OAuth (Passport) and email/password login
- Nodemailer email alert; WhatsApp click-to-chat (no WhatsApp API cost)

## Run locally
1. Copy `server/.env.example` to `server/.env` and fill in the values.
   Copy `client/.env.example` to `client/.env` if the API or store name differs from the local defaults.
2. Install packages: `npm install`
3. Run both apps: `npm run dev`
4. Open `http://localhost:5173`.

For Google login, create OAuth credentials in Google Cloud Console and add `http://localhost:5000/api/auth/google/callback` as an authorized redirect URI.

## Admin access
Register your account, then set its `role` to `admin` in MongoDB Atlas. Admin email is configured through `ADMIN_EMAIL`.

## Security notes
Passwords are hashed, auth tokens are stored in HTTP-only cookies, API inputs are validated, sensitive endpoints are role-protected, CORS is restricted, and rate limiting is enabled. Keep all secrets in `.env`; never commit it.
