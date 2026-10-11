const Finding = require("../models/Finding");
const ReviewHistory = require("../models/ReviewHistory");
const { logAuditEvent } = require("../services/auditLogService");

exports.updateFindingReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, reason } = req.body;

    const validStatuses = [
      "Pending Review",
      "Under Investigation",
      "Confirmed Issue",
      "Dismissed",
      "Resolved",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const finding = await Finding.findOne({ _id: id, owner: req.user._id });
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: "Finding not found or unauthorized.",
      });
    }

    const previousStatus = finding.reviewStatus;
    finding.reviewStatus = status;
    finding.reviewNotes = notes || finding.reviewNotes;
    if (reason) finding.resolutionReason = reason;
    finding.reviewedBy = req.user._id;
    finding.reviewedAt = new Date();

    await finding.save();

    // Create ReviewHistory record
    const historyEntry = await ReviewHistory.create({
      findingId: finding._id,
      datasetId: finding.datasetId,
      reviewer: req.user._id,
      reviewerName: req.user.name,
      previousStatus,
      newStatus: status,
      notes: notes || "",
      reason: reason || "",
      actionTimestamp: new Date(),
    });

    // Log in AuditLog
    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "FINDING_STATUS_CHANGE",
      entityType: "Finding",
      entityId: finding._id,
      datasetId: finding.datasetId,
      details: {
        findingId: finding.findingId,
        previousStatus,
        newStatus: status,
        notes,
        reason,
      },
    });

    res.status(200).json({
      success: true,
      message: `Finding status updated to "${status}".`,
      finding,
      historyEntry,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviewHistoryForFinding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await ReviewHistory.find({ findingId: id })
      .populate("reviewer", "name email")
      .sort({ actionTimestamp: -1 });

    res.status(200).json({
      success: true,
      history,
    });
  } catch (err) {
    next(err);
  }
};
