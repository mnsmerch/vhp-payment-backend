/**
 * api/oauth/callback.js
 * GHL redirects here after a user installs your app.
 * We exchange the code for tokens and store them.
 */

const { saveTokens } = require('../../lib/tokens');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  // If user denied access
  if (error) {
    console.error('OAuth error:', error);
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>❌ Authorization Failed</h2>
        <p>${error}</p>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      throw new Error('Token exchange failed: ' + JSON.stringify(tokens));
    }

    // Save tokens keyed by locationId
    const locationId = tokens.locationId || tokens.location_id;
    await saveTokens(locationId, tokens);

    console.log(`✅ App installed for location: ${locationId}`);

    // Show success page
    return res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>✅ Payment Processor Connected!</h2>
        <p>Authorize.net has been successfully linked to your account.</p>
        <p style="color:#888;font-size:14px">You can close this window and return to GoHighLevel.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.status(500).json({ error: err.message });
  }
}
