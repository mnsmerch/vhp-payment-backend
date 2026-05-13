# GHL Custom Payment Processor — Authorize.net + ACH

A Vercel-hosted backend for GoHighLevel's Custom Payment Provider integration.
Supports credit card payments today, with ACH (eCheck) already wired up and ready.

---

## Project Structure

```
ghl-payment-backend/
├── api/
│   ├── health.js                 ← GET  /health
│   ├── oauth/
│   │   └── callback.js           ← GET  /oauth/callback
│   └── webhook/
│       ├── payment.js            ← POST /webhook/payment
│       ├── refund.js             ← POST /webhook/refund
│       └── ach.js                ← POST /webhook/ach
├── lib/
│   ├── authnet.js                ← Authorize.net card + ACH + refund logic
│   └── tokens.js                 ← GHL OAuth token storage (Upstash Redis)
├── .env.example
├── vercel.json
└── package.json
```

---

## Setup Steps

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ghl-payment-backend.git
cd ghl-payment-backend
npm install
```

### 2. Set Up Upstash Redis (Free Token Storage)

1. Go to [https://upstash.com](https://upstash.com) and create a free account
2. Create a new **Redis** database (free tier is fine)
3. Copy the **REST URL** and **REST Token** from the dashboard

### 3. Create Your `.env` File

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Where to find it |
|---|---|
| `GHL_CLIENT_ID` | GHL Developer > Your App > App Settings |
| `GHL_CLIENT_SECRET` | GHL Developer > Your App > App Settings |
| `REDIRECT_URI` | Your Vercel URL + `/oauth/callback` |
| `AUTHNET_API_LOGIN` | [Authorize.net Sandbox](https://sandbox.authorize.net) > Account > API Credentials |
| `AUTHNET_TRANSACTION_KEY` | Same as above |
| `AUTHNET_ENV` | `sandbox` for testing, `production` for live |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard |

### 4. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

Vercel will give you a URL like: `https://ghl-payment-backend.vercel.app`

### 5. Add Environment Variables in Vercel

1. Go to [vercel.com](https://vercel.com) > Your Project > Settings > Environment Variables
2. Add all variables from your `.env` file
3. Redeploy: `vercel --prod`

### 6. Configure in GHL Developer Portal

In your GHL App settings:

- **Redirect URL**: `https://your-app.vercel.app/oauth/callback`
- **Payment Webhook URL**: `https://your-app.vercel.app/webhook/payment`
- **Refund Webhook URL**: `https://your-app.vercel.app/webhook/refund`

### 7. Verify It's Working

Visit: `https://your-app.vercel.app/health`

You should see:
```json
{
  "status": "ok",
  "service": "GHL Payment Processor - Authorize.net",
  "environment": "sandbox"
}
```

---

## Testing

Use Authorize.net sandbox test card:
- **Card Number**: `4111111111111111`
- **Expiry**: Any future date (e.g. `2026-12`)
- **CVV**: Any 3 digits

---

## Adding ACH to Your GHL Checkout (When Ready)

The ACH endpoint is already live at `/webhook/ach`.

To accept ACH payments, you'll need to:
1. Enable eCheck on your Authorize.net account (free, requires approval)
2. Build or configure a GHL form to collect: routing number, account number, account type, name on account
3. Point that form's submission to `/webhook/ach`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Token exchange failed` | Check `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, and `REDIRECT_URI` match exactly |
| `No response from Authorize.net` | Check `AUTHNET_API_LOGIN` and `AUTHNET_TRANSACTION_KEY` |
| Tokens not saving | Check Upstash `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` |
| 404 on webhook | Check `vercel.json` routes and that the file exists in `api/webhook/` |
