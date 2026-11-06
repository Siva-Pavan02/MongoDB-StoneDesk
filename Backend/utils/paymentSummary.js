const { round2 } = require('./dispatchCalculations');

function derivePaymentSummary(rawInvoiceTotal, rawPayments = []) {
  const invoiceTotal = round2(Math.max(0, Number(rawInvoiceTotal) || 0));
  const received = round2(rawPayments.reduce(
    (acc, p) => acc + (p?.amount !== undefined ? Number(p.amount) : 0),
    0
  ));

  const balance = round2(Math.max(0, invoiceTotal - received));

  let status = 'PAYMENT_DUE';
  if (received > 0 && balance > 0) {
    status = 'PARTIALLY_PAID';
  } else if (received >= invoiceTotal && invoiceTotal > 0) {
    status = 'PAID';
  }

  return {
    invoiceTotal,
    received,
    balance,
    status
  };
}

module.exports = { derivePaymentSummary };
