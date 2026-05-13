/**
 * api/health.js
 * Simple health check so you can verify the deployment is live.
 * Visit: https://your-app.vercel.app/health
 */

export default function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'GHL Payment Processor - Authorize.net',
    timestamp: new Date().toISOString(),
    environment: process.env.AUTHNET_ENV || 'sandbox',
    endpoints: {
      oauth_callback: '/oauth/callback',
      payment_webhook: '/webhook/payment',
      refund_webhook: '/webhook/refund',
      ach_webhook: '/webhook/ach',
    },
  });
}
