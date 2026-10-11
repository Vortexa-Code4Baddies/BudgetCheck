const Reconciliation = require("../models/Reconciliation");
const Transaction = require("../models/Transaction");
const Dataset = require("../models/Dataset");

/**
 * Perform precise financial reconciliation
 */
const reconcileExpenditure = async ({
  datasetId,
  ownerId,
  officialTotal,
  reportingPeriod = "FY 2025-26",
  department = "All Departments",
  notes = "",
}) => {
  // Validate dataset ownership
  const dataset = await Dataset.findOne({ _id: datasetId, owner: ownerId });
  if (!dataset) {
    throw new Error("Dataset not found or unauthorized access.");
  }

  // Build filter query for transactions
  const query = { datasetId, owner: ownerId, isValid: true };
  if (department && department !== "All Departments") {
    query.department = department;
  }

  const transactions = await Transaction.find(query);
  const transactionsCount = transactions.length;

  // Precise integer paise calculation
  let recordedTotalPaise = 0;
  for (const txn of transactions) {
    recordedTotalPaise += txn.amountPaise || Math.round((txn.amount || 0) * 100);
  }

  const officialNum = Number(officialTotal);
  if (isNaN(officialNum)) {
    throw new Error("Official expenditure total must be a valid numeric amount.");
  }

  const officialTotalPaise = Math.round(officialNum * 100);
  const recordedTotal = recordedTotalPaise / 100;

  // Difference = Official Total - Recorded Total
  const differencePaise = officialTotalPaise - recordedTotalPaise;
  const difference = differencePaise / 100;
  const absoluteDifference = Math.abs(difference);

  let percentageDifference = 0;
  if (officialTotalPaise > 0) {
    percentageDifference = Number(((absoluteDifference / (officialTotalPaise / 100)) * 100).toFixed(2));
  } else if (recordedTotalPaise > 0) {
    percentageDifference = 100;
  }

  // Determine status
  let status = "matched";
  let explanation = "";

  if (Math.abs(differencePaise) <= 100) {
    // Within 1 Rupee variance
    status = "matched";
    explanation = "Recorded expenditure matches official allocation within standard tolerance.";
  } else if (difference > 0) {
    status = "discrepancy";
    explanation = `Official allocation exceeds recorded expenditure by ₹${difference.toLocaleString("en-IN")}. Recorded disbursements are under-reported or pending final settlement.`;
  } else {
    status = "discrepancy";
    explanation = `Recorded expenditure exceeds official allocation by ₹${Math.abs(difference).toLocaleString("en-IN")}. Possible expenditure overrun or unapproved disbursements detected.`;
  }

  if (percentageDifference > 5) {
    status = "requires_review";
  }

  // Department-wise sub-totals for deep insight
  const departmentBreakdown = await Transaction.aggregate([
    { $match: { datasetId: dataset._id, isValid: true } },
    {
      $group: {
        _id: "$department",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const reconciliation = await Reconciliation.create({
    datasetId,
    owner: ownerId,
    reportingPeriod,
    department,
    officialTotal: officialNum,
    officialTotalPaise,
    recordedTotal,
    recordedTotalPaise,
    difference,
    differencePaise,
    absoluteDifference,
    percentageDifference,
    transactionsCount,
    status,
    explanation,
    notes,
  });

  return {
    reconciliation,
    departmentBreakdown,
  };
};

module.exports = {
  reconcileExpenditure,
};
