/**
 * api/webhook/ach.js
 * Handles ACH / eCheck payment requests.
 * This is your future ACH endpoint — already wired up and ready to go.
 */

const { chargeACH } = require('../../lib/authnet');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    amount,
    orderId,
    customer,
    bankDetails,  // { routingNumber, accountNumber, accountType, nameOnAccount, bankName }
  } = req.body;

  console.log('📥 ACH payment webhook received:', { orderId, amount });

  if (!amount || !orderId || !bankDetails) {
    return res.status(400).json({
      error: 'Missing required fields: amount, orderId, bankDetails',
    });
  }

  const { routingNumber, accountNumber, accountType, nameOnAccount, bankName } = bankDetails;

  if (!routingNumber || !accountNumber || !nameOnAccount) {
    return res.status(400).json({
      error: 'Missing bank details: routingNumber, accountNumber, nameOnAccount are required',
    });
  }

  try {
    const result = await chargeACH({
      amount: String(amount),
      routingNumber,
      accountNumber,
      accountType: accountType || 'checking',
      nameOnAccount,
      bankName: bankName || '',
      orderId: String(orderId),
      customerEmail: customer?.email || '',
    });

    console.log(`✅ ACH payment success for order ${orderId}:`, result.transactionId);

    return res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      authCode: result.authCode,
      message: 'ACH payment submitted successfully. Funds typically clear in 3-5 business days.',
    });
  } catch (err) {
    console.error(`❌ ACH payment failed for order ${orderId}:`, err.message);

    return res.status(200).json({
      success: false,
      error: err.message,
      message: 'ACH payment failed. Please verify bank account details.',
    });
  }
}
