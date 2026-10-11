const Dataset = require("../models/Dataset");
const Transaction = require("../models/Transaction");
const Reconciliation = require("../models/Reconciliation");
const Finding = require("../models/Finding");
const ReviewHistory = require("../models/ReviewHistory");

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    // 1. Total datasets analyzed
    const totalDatasets = await Dataset.countDocuments({ owner: ownerId });
    const datasetsAnalyzed = await Dataset.countDocuments({
      owner: ownerId,
      analysisStatus: "analyzed",
    });

    // 2. Total transactions analyzed
    const totalTransactions = await Transaction.countDocuments({ owner: ownerId });

    // 3. Total recorded expenditure
    const expenditureSum = await Dataset.aggregate([
      { $match: { owner: ownerId } },
      { $group: { _id: null, total: { $sum: "$totalRecordedAmount" } } },
    ]);
    const totalRecordedExpenditure = expenditureSum[0]?.total || 0;

    // 4. Reconciliation discrepancies
    const reconciliationDiscrepancies = await Reconciliation.countDocuments({
      owner: ownerId,
      status: { $in: ["discrepancy", "requires_review"] },
    });

    // 5. Potential duplicates
    const potentialDuplicates = await Finding.countDocuments({
      owner: ownerId,
      findingType: { $in: ["duplicate_exact", "duplicate_possible"] },
    });

    // 6. Findings awaiting review
    const findingsAwaitingReview = await Finding.countDocuments({
      owner: ownerId,
      reviewStatus: "Pending Review",
    });

    // 7. Total findings
    const totalFindings = await Finding.countDocuments({ owner: ownerId });

    // 8. Spending by department
    const spendingByDepartment = await Transaction.aggregate([
      { $match: { owner: ownerId, isValid: true } },
      {
        $group: {
          _id: "$department",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 8 },
    ]);

    // 9. Monthly spending trends
    const monthlySpending = await Transaction.aggregate([
      {
        $match: {
          owner: ownerId,
          isValid: true,
          date: { $exists: true, $ne: "" },
        },
      },
      {
        $project: {
          month: { $substr: ["$date", 0, 7] }, // YYYY-MM
          amount: "$amount",
        },
      },
      {
        $match: {
          month: { $regex: /^\d{4}-\d{2}$/ },
        },
      },
      {
        $group: {
          _id: "$month",
          totalExpenditure: { $sum: "$amount" },
          transactionsCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 10. Official vs Recorded Reconciliation comparison chart
    const reconciliationComparison = await Reconciliation.aggregate([
      { $match: { owner: ownerId } },
      {
        $project: {
          period: "$reportingPeriod",
          department: "$department",
          official: "$officialTotal",
          recorded: "$recordedTotal",
          difference: "$difference",
          status: "$status",
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
    ]);

    // 11. Findings grouped by severity
    const findingsBySeverity = await Finding.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    // 12. Findings grouped by review status
    const findingsByStatus = await Finding.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: "$reviewStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // 13. Recent activities
    const recentDatasets = await Dataset.find({ owner: ownerId })
      .select("name originalFilename totalRows totalRecordedAmount analysisStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentReconciliations = await Reconciliation.find({ owner: ownerId })
      .populate("datasetId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentFindings = await Finding.find({ owner: ownerId })
      .populate("datasetId", "name")
      .sort({ createdAt: -1 })
      .limit(6);

    const recentReviews = await ReviewHistory.find({})
      .populate("findingId", "findingId title")
      .populate("datasetId", "name")
      .sort({ actionTimestamp: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      summary: {
        totalDatasets,
        datasetsAnalyzed,
        totalTransactions,
        totalRecordedExpenditure,
        reconciliationDiscrepancies,
        potentialDuplicates,
        findingsAwaitingReview,
        totalFindings,
      },
      charts: {
        spendingByDepartment: spendingByDepartment.map((d) => ({
          department: d._id || "Unassigned",
          amount: d.totalAmount,
          count: d.count,
        })),
        monthlySpending: monthlySpending.map((m) => ({
          month: m._id,
          expenditure: m.totalExpenditure,
          count: m.transactionsCount,
        })),
        reconciliationComparison,
        findingsBySeverity: findingsBySeverity.map((s) => ({
          severity: s._id,
          count: s.count,
        })),
        findingsByStatus: findingsByStatus.map((s) => ({
          status: s._id,
          count: s.count,
        })),
      },
      recentActivity: {
        recentDatasets,
        recentReconciliations,
        recentFindings,
        recentReviews,
      },
    });
  } catch (err) {
    next(err);
  }
};
