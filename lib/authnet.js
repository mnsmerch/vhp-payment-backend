/**
 * lib/authnet.js
 * Authorize.net helpers for credit card and ACH (eCheck) payments.
 * Supports both sandbox and production environments.
 */

const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const SDKConstants = require('authorizenet').Constants;

function getMerchantAuth() {
  const auth = new ApiContracts.MerchantAuthenticationType();
  auth.setName(process.env.AUTHNET_API_LOGIN);
  auth.setTransactionKey(process.env.AUTHNET_TRANSACTION_KEY);
  return auth;
}

function getEnvironment() {
  return process.env.AUTHNET_ENV === 'production'
    ? SDKConstants.endpoint.production
    : SDKConstants.endpoint.sandbox;
}

/**
 * Charge a credit card
 * @param {object} params
 * @param {string} params.amount         - e.g. "99.99"
 * @param {string} params.cardNumber     - e.g. "4111111111111111"
 * @param {string} params.expirationDate - e.g. "2026-12"
 * @param {string} params.cardCode       - CVV
 * @param {string} params.orderId        - Your internal order reference
 * @param {string} params.customerEmail
 * @returns {Promise<{ transactionId, authCode, responseCode }>}
 */
function chargeCard({ amount, cardNumber, expirationDate, cardCode, orderId, customerEmail }) {
  return new Promise((resolve, reject) => {
    const merchantAuth = getMerchantAuth();

    const cardData = new ApiContracts.CreditCardType();
    cardData.setCardNumber(cardNumber);
    cardData.setExpirationDate(expirationDate);
    cardData.setCardCode(cardCode);

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(cardData);

    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(orderId);

    const customer = new ApiContracts.CustomerDataType();
    customer.setEmail(customerEmail);

    const txnRequest = new ApiContracts.TransactionRequestType();
    txnRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    txnRequest.setPayment(paymentType);
    txnRequest.setAmount(amount);
    txnRequest.setOrder(orderDetails);
    txnRequest.setCustomer(customer);

    const request = new ApiContracts.CreateTransactionRequest();
    request.setMerchantAuthentication(merchantAuth);
    request.setTransactionRequest(txnRequest);

    const ctrl = new ApiControllers.CreateTransactionController(request.getJSON());
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const response = ctrl.getResponse();

      if (!response) return reject(new Error('No response from Authorize.net'));

      const resultCode = response.messages?.resultCode;
      const txnResponse = response.transactionResponse;

      if (resultCode === 'Ok' && txnResponse?.responseCode === '1') {
        resolve({
          transactionId: txnResponse.transId,
          authCode: txnResponse.authCode,
          responseCode: txnResponse.responseCode,
        });
      } else {
        const errorMsg =
          txnResponse?.errors?.error?.[0]?.errorText ||
          response.messages?.message?.[0]?.text ||
          'Transaction failed';
        reject(new Error(errorMsg));
      }
    });
  });
}

/**
 * Charge via ACH / eCheck (bank account)
 * @param {object} params
 * @param {string} params.amount          - e.g. "99.99"
 * @param {string} params.routingNumber   - Bank routing number
 * @param {string} params.accountNumber   - Bank account number
 * @param {string} params.accountType     - "checking" | "savings" | "businessChecking"
 * @param {string} params.nameOnAccount   - Account holder name
 * @param {string} params.bankName        - Name of the bank
 * @param {string} params.orderId         - Your internal order reference
 * @param {string} params.customerEmail
 * @returns {Promise<{ transactionId, authCode, responseCode }>}
 */
function chargeACH({ amount, routingNumber, accountNumber, accountType, nameOnAccount, bankName, orderId, customerEmail }) {
  return new Promise((resolve, reject) => {
    const merchantAuth = getMerchantAuth();

    // Map accountType string to Authorize.net enum
    const accountTypeMap = {
      checking: ApiContracts.BankAccountTypeEnum.CHECKING,
      savings: ApiContracts.BankAccountTypeEnum.SAVINGS,
      businessChecking: ApiContracts.BankAccountTypeEnum.BUSINESSCHECKING,
    };

    const bankAccount = new ApiContracts.BankAccountType();
    bankAccount.setAccountType(accountTypeMap[accountType] || ApiContracts.BankAccountTypeEnum.CHECKING);
    bankAccount.setRoutingNumber(routingNumber);
    bankAccount.setAccountNumber(accountNumber);
    bankAccount.setNameOnAccount(nameOnAccount);
    bankAccount.setBankName(bankName || '');
    bankAccount.setEcheckType(ApiContracts.EcheckTypeEnum.WEB); // WEB = online authorization

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setBankAccount(bankAccount);

    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(orderId);

    const customer = new ApiContracts.CustomerDataType();
    customer.setEmail(customerEmail);

    const txnRequest = new ApiContracts.TransactionRequestType();
    txnRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    txnRequest.setPayment(paymentType);
    txnRequest.setAmount(amount);
    txnRequest.setOrder(orderDetails);
    txnRequest.setCustomer(customer);

    const request = new ApiContracts.CreateTransactionRequest();
    request.setMerchantAuthentication(merchantAuth);
    request.setTransactionRequest(txnRequest);

    const ctrl = new ApiControllers.CreateTransactionController(request.getJSON());
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const response = ctrl.getResponse();

      if (!response) return reject(new Error('No response from Authorize.net'));

      const resultCode = response.messages?.resultCode;
      const txnResponse = response.transactionResponse;

      if (resultCode === 'Ok' && txnResponse?.responseCode === '1') {
        resolve({
          transactionId: txnResponse.transId,
          authCode: txnResponse.authCode,
          responseCode: txnResponse.responseCode,
        });
      } else {
        const errorMsg =
          txnResponse?.errors?.error?.[0]?.errorText ||
          response.messages?.message?.[0]?.text ||
          'ACH transaction failed';
        reject(new Error(errorMsg));
      }
    });
  });
}

/**
 * Refund a previously settled transaction
 * @param {object} params
 * @param {string} params.transactionId  - Original Authorize.net transaction ID
 * @param {string} params.amount         - Amount to refund
 * @param {string} params.last4          - Last 4 digits of card (required by Authorize.net)
 * @returns {Promise<{ transactionId }>}
 */
function refundTransaction({ transactionId, amount, last4 }) {
  return new Promise((resolve, reject) => {
    const merchantAuth = getMerchantAuth();

    const cardData = new ApiContracts.CreditCardType();
    cardData.setCardNumber(last4);
    cardData.setExpirationDate('XXXX'); // Required placeholder for refunds

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(cardData);

    const txnRequest = new ApiContracts.TransactionRequestType();
    txnRequest.setTransactionType(ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION);
    txnRequest.setPayment(paymentType);
    txnRequest.setAmount(amount);
    txnRequest.setRefTransId(transactionId);

    const request = new ApiContracts.CreateTransactionRequest();
    request.setMerchantAuthentication(merchantAuth);
    request.setTransactionRequest(txnRequest);

    const ctrl = new ApiControllers.CreateTransactionController(request.getJSON());
    ctrl.setEnvironment(getEnvironment());

    ctrl.execute(() => {
      const response = ctrl.getResponse();
      if (!response) return reject(new Error('No response from Authorize.net'));

      const resultCode = response.messages?.resultCode;
      const txnResponse = response.transactionResponse;

      if (resultCode === 'Ok' && txnResponse?.responseCode === '1') {
        resolve({ transactionId: txnResponse.transId });
      } else {
        const errorMsg =
          txnResponse?.errors?.error?.[0]?.errorText ||
          response.messages?.message?.[0]?.text ||
          'Refund failed';
        reject(new Error(errorMsg));
      }
    });
  });
}

module.exports = { chargeCard, chargeACH, refundTransaction };
