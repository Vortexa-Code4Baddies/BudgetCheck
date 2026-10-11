const Reconciliation = require("../models/Reconciliation");
const Dataset = require("../models/Dataset");
const { reconcileExpenditure } = require("../services/reconciliationService");
const { logAuditEvent } = require("../services/auditLogService");

exports.executeReconciliation = async (req, res, next) => {
  try {
    const { datasetId, officialTotal, reportingPeriod, department, notes } = req.body;

    if (!datasetId || officialTotal === undefined || officialTotal === null || officialTotal === "") {
      return res.status(400).json({
        success: false,
        message: "Dataset ID and Official Expenditure Total are required.",
      });
    }

    const result = await reconcileExpenditure({
      datasetId,
      ownerId: req.user._id,
      officialTotal,
      reportingPeriod: reportingPeriod || "FY 2025-26",
      department: department || "All Departments",
      notes: notes || "",
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "RECONCILIATION_RUN",
      entityType: "Reconciliation",
      entityId: result.reconciliation._id,
      datasetId,
      details: {
        officialTotal: result.reconciliation.officialTotal,
        recordedTotal: result.reconciliation.recordedTotal,
        difference: result.reconciliation.difference,
        status: result.reconciliation.status,
      },
    });

    res.status(201).json({
      success: true,
      message: "Reconciliation analysis executed successfully.",
      reconciliation: result.reconciliation,
      departmentBreakdown: result.departmentBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReconciliations = async (req, res, next) => {
  try {
    const { datasetId } = req.query;
    const query = { owner: req.user._id };

    if (datasetId) {
      query.datasetId = datasetId;
    }

    const reconciliations = await Reconciliation.find(query)
      .populate("datasetId", "name originalFilename")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reconciliations.length,
      reconciliations,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReconciliationById = async (req, res, next) => {
  try {
    const reconciliation = await Reconciliation.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("datasetId", "name originalFilename reportingPeriod");

    if (!reconciliation) {
      return res.status(404).json({
        success: false,
        message: "Reconciliation record not found or unauthorized.",
      });
    }

    res.status(200).json({
      success: true,
      reconciliation,
    });
  } catch (err) {
    next(err);
  }
};
