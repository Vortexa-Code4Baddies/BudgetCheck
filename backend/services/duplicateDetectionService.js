const Transaction = require("../models/Transaction");

/**
 * Detect exact and possible duplicate transactions
 */
const detectDuplicates = async (datasetId, ownerId) => {
  const transactions = await Transaction.find({ datasetId, owner: ownerId }).sort({ sourceRowNumber: 1 });
  const findings = [];
  let findingCounter = 1;

  // 1. Exact Duplicate Candidates
  // Condition: Same payment reference (if non-empty) OR (Same vendor + Same amountPaise + Same date)
  const exactGroups = new Map();

  for (const txn of transactions) {
    // If valid payment reference exists
    if (txn.paymentReference && txn.paymentReference.trim().length > 3) {
      const key = `REF_${txn.paymentReference.trim().toUpperCase()}`;
      if (!exactGroups.has(key)) exactGroups.set(key, []);
      exactGroups.get(key).push(txn);
    }

    // Also group by Vendor + AmountPaise + Date
    if (txn.vendor && txn.amountPaise && txn.date) {
      const key = `VAD_${txn.vendor.trim().toLowerCase()}_${txn.amountPaise}_${txn.date}`;
      if (!exactGroups.has(key)) exactGroups.set(key, []);
      exactGroups.get(key).push(txn);
    }
  }

  const processedExactIds = new Set();

  for (const [key, group] of exactGroups.entries()) {
    // De-duplicate items inside group
    const uniqueTxns = [];
    const seen = new Set();
    for (const t of group) {
      if (!seen.has(t._id.toString())) {
        seen.add(t._id.toString());
        uniqueTxns.push(t);
      }
    }

    if (uniqueTxns.length >= 2) {
      // Check if already covered
      const keyIdString = uniqueTxns.map((t) => t._id.toString()).sort().join("-");
      if (processedExactIds.has(keyIdString)) continue;
      processedExactIds.add(keyIdString);

      const rows = uniqueTxns.map((t) => t.sourceRowNumber);
      const isRefMatch = key.startsWith("REF_");
      const matchCriteria = isRefMatch
        ? `Identical payment reference (${uniqueTxns[0].paymentReference})`
        : `Identical vendor (${uniqueTxns[0].vendor}), amount (₹${uniqueTxns[0].amount.toLocaleString("en-IN")}), and date (${uniqueTxns[0].date})`;

      findings.push({
        findingId: `FND-DUP-EXACT-${String(findingCounter++).padStart(3, "0")}`,
        title: `Potential Exact Duplicate Payment (${uniqueTxns[0].vendor})`,
        findingType: "duplicate_exact",
        severity: "high",
        explanation: `Multiple transactions detected with ${matchCriteria}. Rows [${rows.join(", ")}] have identical parameters, representing a potential double-disbursement risk.`,
        detectionMethod: isRefMatch ? "Payment Reference Collision Match" : "Exact Tuple Match (Vendor + Amount + Date)",
        affectedTransactions: uniqueTxns.map((t) => t._id),
        sourceRowReferences: rows,
        amountInvolved: uniqueTxns[0].amount,
        confidenceScore: 0.98,
        metadata: {
          vendor: uniqueTxns[0].vendor,
          amount: uniqueTxns[0].amount,
          rows,
          matchType: isRefMatch ? "Reference Match" : "Tuple Match",
        },
      });
    }
  }

  // 2. Possible Duplicate Candidates
  // Condition: Same Vendor + Same AmountPaise, but dates within 7 days OR slightly differing references
  const vendorAmountMap = new Map();
  for (const txn of transactions) {
    if (txn.vendor && txn.amountPaise) {
      const key = `${txn.vendor.trim().toLowerCase()}_${txn.amountPaise}`;
      if (!vendorAmountMap.has(key)) vendorAmountMap.set(key, []);
      vendorAmountMap.get(key).push(txn);
    }
  }

  for (const [key, group] of vendorAmountMap.entries()) {
    if (group.length >= 2) {
      // Filter out those already flagged as exact duplicate
      const unflagged = group.filter((t) => {
        return !findings.some((f) => f.affectedTransactions.some((id) => id.toString() === t._id.toString()));
      });

      if (unflagged.length >= 2) {
        // Compare pairs for date proximity
        for (let i = 0; i < unflagged.length; i++) {
          for (let j = i + 1; j < unflagged.length; j++) {
            const t1 = unflagged[i];
            const t2 = unflagged[j];

            const d1 = t1.dateParsed ? new Date(t1.dateParsed) : null;
            const d2 = t2.dateParsed ? new Date(t2.dateParsed) : null;

            let isNearDate = false;
            let daysDiff = 0;
            if (d1 && d2) {
              const diffTime = Math.abs(d2.getTime() - d1.getTime());
              daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (daysDiff <= 14) isNearDate = true;
            } else {
              isNearDate = true; // Flag for review if dates cannot be strictly compared
            }

            if (isNearDate) {
              const rows = [t1.sourceRowNumber, t2.sourceRowNumber];
              findings.push({
                findingId: `FND-DUP-POSS-${String(findingCounter++).padStart(3, "0")}`,
                title: `Possible Near-Date Duplicate Candidate (${t1.vendor})`,
                findingType: "duplicate_possible",
                severity: "medium",
                explanation: `Transactions on row ${t1.sourceRowNumber} (${t1.date || "N/A"}) and row ${t2.sourceRowNumber} (${t2.date || "N/A"}) share the exact same payee and amount (₹${t1.amount.toLocaleString("en-IN")}) within ${daysDiff} days of each other. Verify whether this represents separate installments or a duplicate submission.`,
                detectionMethod: "Temporal Proximity & Exact Amount Heuristic (<=14 Days)",
                affectedTransactions: [t1._id, t2._id],
                sourceRowReferences: rows,
                amountInvolved: t1.amount,
                confidenceScore: 0.85,
                metadata: {
                  vendor: t1.vendor,
                  amount: t1.amount,
                  daysDifference: daysDiff,
                  rows,
                },
              });
            }
          }
        }
      }
    }
  }

  return findings;
};

module.exports = {
  detectDuplicates,
};
