const Finding = require("../models/Finding");
const Transaction = require("../models/Transaction");
const ReviewHistory = require("../models/ReviewHistory");
const { generateExplanation } = require("../services/aiExplanationService");

exports.getFindings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      datasetId = "",
      findingType = "",
      severity = "",
      reviewStatus = "",
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { owner: req.user._id };

    if (datasetId) query.datasetId = datasetId;
    if (findingType) query.findingType = findingType;
    if (severity) query.severity = severity;
    if (reviewStatus) query.reviewStatus = reviewStatus;

    if (search) {
      query.$or = [
        { findingId: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { explanation: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    const total = await Finding.countDocuments(query);
    const findings = await Finding.find(query)
      .populate("datasetId", "name originalFilename")
      .populate("affectedTransactions", "transactionId vendor amount date department category paymentReference")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Summary counts for filter badges
    const statusCounts = await Finding.aggregate([
      { $match: { owner: req.user._id } },
      { $group: { _id: "$reviewStatus", count: { $sum: 1 } } },
    ]);

    const severityCounts = await Finding.aggregate([
      { $match: { owner: req.user._id } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      statusCounts,
      severityCounts,
      findings,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFindingById = async (req, res, next) => {
  try {
    const finding = await Finding.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
      .populate("datasetId", "name originalFilename")
      .populate("affectedTransactions")
      .populate("reviewedBy", "name email");

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: "Finding not found or unauthorized.",
      });
    }

    // Also get review history for this finding
    const history = await ReviewHistory.find({ findingId: finding._id })
      .populate("reviewer", "name email")
      .sort({ actionTimestamp: -1 });

    res.status(200).json({
      success: true,
      finding,
      history,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAiExplanation = async (req, res, next) => {
  try {
    const finding = await Finding.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("affectedTransactions");

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: "Finding not found or unauthorized.",
      });
    }

    const explanation = await generateExplanation(finding, finding.affectedTransactions || []);

    finding.aiExplanation = explanation;
    await finding.save();

    res.status(200).json({
      success: true,
      explanation,
    });
  } catch (err) {
    next(err);
  }
};
