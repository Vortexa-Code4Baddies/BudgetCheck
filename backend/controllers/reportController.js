const path = require("path");
const fs = require("fs");
const Report = require("../models/Report");
const Dataset = require("../models/Dataset");
const Reconciliation = require("../models/Reconciliation");
const Finding = require("../models/Finding");
const Transaction = require("../models/Transaction");
const { generatePdfReport } = require("../services/pdfReportService");
const { logAuditEvent } = require("../services/auditLogService");

const reportsDir = path.join(__dirname, "../uploads/reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

exports.generateReport = async (req, res, next) => {
  try {
    const { datasetId, reportType = "Comprehensive Audit", title } = req.body;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: "Dataset ID is required.",
      });
    }

    const dataset = await Dataset.findOne({ _id: datasetId, owner: req.user._id });
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found or unauthorized.",
      });
    }

    const reconciliation = await Reconciliation.findOne({ datasetId, owner: req.user._id }).sort({
      createdAt: -1,
    });

    const findings = await Finding.find({ datasetId, owner: req.user._id }).sort({
      severity: 1,
      createdAt: -1,
    });

    const reportId = `AUDIT-REP-${Date.now().toString().slice(-6)}`;
    const fileName = `${reportId}_${dataset.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const outputPath = path.join(reportsDir, fileName);

    const pdfResult = await generatePdfReport({
      dataset,
      reconciliation,
      findings,
      reviewerName: req.user.name,
      reportType,
      outputPath,
    });

    const duplicatesCount = findings.filter((f) => f.findingType.startsWith("duplicate")).length;
    const anomaliesCount = findings.length - duplicatesCount;
    const reviewedCount = findings.filter((f) => f.reviewStatus !== "Pending Review").length;

    const report = await Report.create({
      reportId,
      datasetId: dataset._id,
      datasetName: dataset.name,
      owner: req.user._id,
      title: title || `Audit Investigation Report — ${dataset.name}`,
      reportType,
      fileName,
      fileSize: pdfResult.fileSize,
      generationStatus: "completed",
      summarySnapshot: {
        totalRecorded: dataset.totalRecordedAmount,
        officialTotal: reconciliation ? reconciliation.officialTotal : null,
        reconciliationDifference: reconciliation ? reconciliation.difference : null,
        totalTransactions: dataset.totalRows,
        totalFindings: findings.length,
        duplicatesCount,
        anomaliesCount,
        reviewedCount,
      },
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "REPORT_GENERATED",
      entityType: "Report",
      entityId: report._id,
      datasetId: dataset._id,
      details: {
        reportId,
        reportType,
        fileName,
      },
    });

    res.status(201).json({
      success: true,
      message: "Audit PDF report generated successfully.",
      report,
    });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { datasetId } = req.query;
    const query = { owner: req.user._id };

    if (datasetId) query.datasetId = datasetId;

    const reports = await Report.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, owner: req.user._id });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized.",
      });
    }

    const filePath = path.join(reportsDir, report.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Report file not found on disk. Please regenerate the report.",
      });
    }

    report.downloadCount += 1;
    await report.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
