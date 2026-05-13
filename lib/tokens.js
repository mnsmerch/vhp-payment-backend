/**
 * lib/tokens.js
 * Stores and retrieves GHL OAuth tokens using Upstash Redis (free tier).
 * Each GHL location gets its own token entry keyed by locationId.
 */

async function redisRequest(method, body) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const res = await fetch(`${url}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.result;
}

/**
 * Save tokens for a GHL location
 * @param {string} locationId
 * @param {object} tokens - { access_token, refresh_token, expires_in }
 */
async function saveTokens(locationId, tokens) {
  const key = `ghl:tokens:${locationId}`;
  await redisRequest('set', [key, JSON.stringify({
    ...tokens,
    savedAt: Date.now(),
  })]);
}

/**
 * Get tokens for a GHL location
 * @param {string} locationId
 * @returns {object|null}
 */
async function getTokens(locationId) {
  const key = `ghl:tokens:${locationId}`;
  const result = await redisRequest('get', [key]);
  if (!result) return null;
  return JSON.parse(result);
}

/**
 * Refresh access token using the stored refresh token
 * @param {string} locationId
 * @returns {object} new tokens
 */
async function refreshAccessToken(locationId) {
  const existing = await getTokens(locationId);
  if (!existing?.refresh_token) throw new Error('No refresh token found for location: ' + locationId);

  const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: existing.refresh_token,
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
    }),
  });

  const newTokens = await res.json();
  if (!newTokens.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(newTokens));

  await saveTokens(locationId, newTokens);
  return newTokens;
}

module.exports = { saveTokens, getTokens, refreshAccessToken };
