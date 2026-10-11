const Transaction = require("../models/Transaction");

/**
 * Calculate statistical percentiles and median
 */
const calculateStats = (numbers) => {
  if (!numbers || numbers.length === 0) return null;

  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p) => {
    const idx = (n - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const median = getPercentile(0.5);
  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  // Median Absolute Deviation (MAD)
  const deviations = sorted.map((x) => Math.abs(x - median)).sort((a, b) => a - b);
  const madIdx = Math.floor(deviations.length / 2);
  const mad = deviations[madIdx] || 0;

  return { median, q1, q3, iqr, mad, count: n };
};

/**
 * Detect unusual spending patterns and statistical outliers
 */
const detectAnomalies = async (datasetId, ownerId) => {
  const transactions = await Transaction.find({ datasetId, owner: ownerId }).sort({ sourceRowNumber: 1 });
  const findings = [];
  let findingCounter = 1;

  if (transactions.length === 0) return findings;

  // Gather positive valid amounts for global distribution
  const validPositiveAmounts = transactions
    .filter((t) => t.amount > 0)
    .map((t) => t.amount);

  const globalStats = calculateStats(validPositiveAmounts);

  // 1. Category-specific Statistical Outlier Detection
  const categoryGroups = new Map();
  for (const t of transactions) {
    if (t.amount > 0 && t.category) {
      if (!categoryGroups.has(t.category)) categoryGroups.set(t.category, []);
      categoryGroups.get(t.category).push(t);
    }
  }

  for (const [category, txns] of categoryGroups.entries()) {
    if (txns.length >= 3) {
      const amounts = txns.map((t) => t.amount);
      const stats = calculateStats(amounts);

      // IQR Outlier threshold: Q3 + 2.0 * IQR
      const threshold = stats.q3 + 2.0 * stats.iqr;

      for (const txn of txns) {
        if (txn.amount > threshold && txn.amount > stats.median * 3) {
          findings.push({
            findingId: `FND-ANOM-STAT-${String(findingCounter++).padStart(3, "0")}`,
            title: `Severe Statistical Outlier in "${category}"`,
            findingType: "unusual_amount_outlier",
            severity: txn.amount > threshold * 2 ? "critical" : "high",
            explanation: `Transaction of ₹${txn.amount.toLocaleString("en-IN")} on row ${txn.sourceRowNumber} exceeds the upper statistical bound (₹${Math.round(threshold).toLocaleString("en-IN")}) for "${category}". The category median expenditure is ₹${Math.round(stats.median).toLocaleString("en-IN")} (IQR: ₹${Math.round(stats.iqr).toLocaleString("en-IN")}).`,
            detectionMethod: "Interquartile Range (IQR) & Category Median Deviation",
            affectedTransactions: [txn._id],
            sourceRowReferences: [txn.sourceRowNumber],
            amountInvolved: txn.amount,
            comparisonValue: stats.median,
            confidenceScore: 0.92,
            metadata: {
              category,
              categoryMedian: stats.median,
              upperBound: threshold,
              iqr: stats.iqr,
            },
          });
        }
      }
    }
  }

  // 2. High Absolute Amount Threshold (> ₹50,00,000)
  for (const txn of transactions) {
    if (txn.amount >= 5000000) {
      // Check if not already added
      const alreadyFlagged = findings.some((f) =>
        f.affectedTransactions.some((id) => id.toString() === txn._id.toString())
      );
      if (!alreadyFlagged) {
        findings.push({
          findingId: `FND-ANOM-VAL-${String(findingCounter++).padStart(3, "0")}`,
          title: `High-Value Capital Outlay (> ₹50 Lakhs)`,
          findingType: "unusual_amount_outlier",
          severity: "high",
          explanation: `Expenditure of ₹${txn.amount.toLocaleString("en-IN")} to "${txn.vendor}" exceeds the mandatory high-value review threshold (₹50,00,000). Verify procurement sanction orders and tender references.`,
          detectionMethod: "Absolute Materiality Threshold (₹50L+)",
          affectedTransactions: [txn._id],
          sourceRowReferences: [txn.sourceRowNumber],
          amountInvolved: txn.amount,
          comparisonValue: 5000000,
          confidenceScore: 0.9,
          metadata: {
            vendor: txn.vendor,
            department: txn.department,
          },
        });
      }
    }
  }

  // 3. Negative Amount / Reversal Verification
  for (const txn of transactions) {
    if (txn.amount < 0) {
      findings.push({
        findingId: `FND-ANOM-REV-${String(findingCounter++).padStart(3, "0")}`,
        title: `Negative Expenditure / Journal Reversal Detected`,
        findingType: "negative_reversal",
        severity: "medium",
        explanation: `Row ${txn.sourceRowNumber} records a negative disbursement of ₹${txn.amount.toLocaleString("en-IN")} with status "${txn.status}". While credit notes and recovery adjustments occur in municipal accounting, this requires verified voucher documentation.`,
        detectionMethod: "Negative Sign Value Audit Check",
        affectedTransactions: [txn._id],
        sourceRowReferences: [txn.sourceRowNumber],
        amountInvolved: Math.abs(txn.amount),
        comparisonValue: 0,
        confidenceScore: 0.95,
        metadata: {
          vendor: txn.vendor,
          rawAmount: txn.amount,
        },
      });
    }
  }

  // 4. Missing Payment Reference on Substantial Amount (> ₹1,00,000)
  for (const txn of transactions) {
    if (txn.amount >= 100000 && (!txn.paymentReference || txn.paymentReference.trim() === "")) {
      findings.push({
        findingId: `FND-ANOM-DAT-${String(findingCounter++).padStart(3, "0")}`,
        title: `Missing Banking UTR / Payment Reference on High Value`,
        findingType: "missing_critical_data",
        severity: "high",
        explanation: `Transaction of ₹${txn.amount.toLocaleString("en-IN")} for "${txn.department}" lacks a banking payment reference, RTGS UTR, or cheque voucher. Traceability is impaired.`,
        detectionMethod: "Audit Trail Completeness Verification",
        affectedTransactions: [txn._id],
        sourceRowReferences: [txn.sourceRowNumber],
        amountInvolved: txn.amount,
        comparisonValue: null,
        confidenceScore: 0.88,
        metadata: {
          department: txn.department,
          vendor: txn.vendor,
        },
      });
    }
  }

  // 5. Unusually High Frequency to Single Payee (e.g. 4+ disbursements in short span)
  const payeeFrequency = new Map();
  for (const txn of transactions) {
    if (txn.vendor && txn.vendor !== "Unknown Payee") {
      const key = txn.vendor.trim();
      if (!payeeFrequency.has(key)) payeeFrequency.set(key, []);
      payeeFrequency.get(key).push(txn);
    }
  }

  for (const [payee, txns] of payeeFrequency.entries()) {
    if (txns.length >= 4) {
      const totalPaid = txns.reduce((acc, t) => acc + (t.amount || 0), 0);
      const rows = txns.map((t) => t.sourceRowNumber);
      findings.push({
        findingId: `FND-ANOM-FREQ-${String(findingCounter++).padStart(3, "0")}`,
        title: `High Transaction Frequency to Single Payee (${payee})`,
        findingType: "rapid_payments",
        severity: "medium",
        explanation: `A total of ${txns.length} separate disbursements totaling ₹${totalPaid.toLocaleString("en-IN")} were made to "${payee}" across rows [${rows.slice(0, 5).join(", ")}${rows.length > 5 ? "..." : ""}]. Ensure contracts were not split to avoid tender thresholds.`,
        detectionMethod: "Payee Concentration & Contract Splitting Analysis",
        affectedTransactions: txns.map((t) => t._id),
        sourceRowReferences: rows,
        amountInvolved: totalPaid,
        comparisonValue: globalStats ? globalStats.median * txns.length : null,
        confidenceScore: 0.8,
        metadata: {
          payee,
          transactionCount: txns.length,
          totalPaid,
        },
      });
    }
  }

  return findings;
};

module.exports = {
  detectAnomalies,
  calculateStats,
};
