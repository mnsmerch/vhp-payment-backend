/**
 * api/webhook/payment.js
 * GHL fires this when a customer initiates a payment at checkout.
 * We charge the card via Authorize.net and return the result.
 */

const { chargeCard } = require('../../lib/authnet');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: verify webhook signature from GHL
  // const signature = req.headers['x-ghl-signature'];
  // if (signature !== process.env.GHL_WEBHOOK_SECRET) {
  //   return res.status(401).json({ error: 'Invalid signature' });
  // }

  const {
    amount,
    currency,
    orderId,
    customer,
    paymentMethod,     // Contains card details from GHL
  } = req.body;

  // Log incoming webhook for debugging
  console.log('📥 Payment webhook received:', { orderId, amount, currency });

  if (!amount || !orderId) {
    return res.status(400).json({ error: 'Missing required fields: amount, orderId' });
  }

  try {
    const result = await chargeCard({
      amount: String(amount),
      cardNumber: paymentMethod?.cardNumber,
      expirationDate: paymentMethod?.expirationDate,  // Format: YYYY-MM
      cardCode: paymentMethod?.cvv,
      orderId: String(orderId),
      customerEmail: customer?.email || '',
    });

    console.log(`✅ Payment success for order ${orderId}:`, result.transactionId);

    // GHL expects this response format
    return res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      authCode: result.authCode,
      message: 'Payment processed successfully',
    });
  } catch (err) {
    console.error(`❌ Payment failed for order ${orderId}:`, err.message);

    return res.status(200).json({
      // Return 200 so GHL receives the error details (not a server crash)
      success: false,
      error: err.message,
      message: 'Payment failed. Please check card details and try again.',
    });
  }
}
