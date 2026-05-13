/**
 * api/webhook/refund.js
 * GHL fires this when a refund is initiated from the GHL dashboard.
 */

const { refundTransaction } = require('../../lib/authnet');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transactionId, amount, last4, orderId } = req.body;

  console.log('📥 Refund webhook received:', { transactionId, amount, orderId });

  if (!transactionId || !amount) {
    return res.status(400).json({ error: 'Missing required fields: transactionId, amount' });
  }

  try {
    const result = await refundTransaction({
      transactionId,
      amount: String(amount),
      last4: last4 || '0000',
    });

    console.log(`✅ Refund success for transaction ${transactionId}:`, result.transactionId);

    return res.status(200).json({
      success: true,
      refundTransactionId: result.transactionId,
      message: 'Refund processed successfully',
    });
  } catch (err) {
    console.error(`❌ Refund failed for transaction ${transactionId}:`, err.message);

    return res.status(200).json({
      success: false,
      error: err.message,
      message: 'Refund failed. The transaction may not be settled yet.',
    });
  }
}
