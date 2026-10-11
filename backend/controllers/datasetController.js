const Dataset = require("../models/Dataset");
const Transaction = require("../models/Transaction");
const Reconciliation = require("../models/Reconciliation");
const Finding = require("../models/Finding");
const ReviewHistory = require("../models/ReviewHistory");
const Report = require("../models/Report");
const { parseCsvBuffer } = require("../services/csvParserService");
const { validateAndNormalizeRecords } = require("../services/validationService");
const { detectDuplicates } = require("../services/duplicateDetectionService");
const { detectAnomalies } = require("../services/anomalyDetectionService");
const { generateExplanation } = require("../services/aiExplanationService");
const { logAuditEvent } = require("../services/auditLogService");

/**
 * 1. Parse uploaded CSV buffer without saving to DB yet, returning mapping & preview
 */
exports.parseUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded. Please select a valid .csv file.",
      });
    }

    const { rawHeaders, suggestedMapping, records, totalRows } = parseCsvBuffer(req.file.buffer);

    // Provide preview of first 15 rows
    const preview = records.slice(0, 15);

    res.status(200).json({
      success: true,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      totalRows,
      rawHeaders,
      suggestedMapping,
      preview,
      // For immediate confirmation if user accepts mapping
      allRecords: totalRows <= 5000 ? records : records.slice(0, 5000),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Save mapped dataset and insert normalized transactions into DB
 */
exports.saveDataset = async (req, res, next) => {
  try {
    const {
      name,
      originalFilename,
      columnMapping,
      records,
      reportingPeriod = "FY 2025-26",
      notes = "",
    } = req.body;

    if (!name || !originalFilename || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. Dataset name, filename, and records are required.",
      });
    }

    const rawHeaders = Object.keys(records[0] || {});

    // Create dataset document placeholder
    const dataset = new Dataset({
      name: name.trim(),
      originalFilename,
      owner: req.user._id,
      columnMapping,
      rawHeaders,
      totalRows: records.length,
      reportingPeriod,
      notes,
      analysisStatus: "uploaded",
    });

    // Validate and normalize transactions
    const {
      normalizedTransactions,
      validationSummary,
      validRows,
      invalidRows,
      totalRecordedAmount,
      totalAmountPaise,
    } = validateAndNormalizeRecords(records, columnMapping, dataset._id, req.user._id);

    dataset.validationSummary = validationSummary;
    dataset.validRows = validRows;
    dataset.invalidRows = invalidRows;
    dataset.totalRecordedAmount = totalRecordedAmount;
    dataset.totalAmountPaise = totalAmountPaise;

    await dataset.save();

    // Bulk insert transactions
    if (normalizedTransactions.length > 0) {
      await Transaction.insertMany(normalizedTransactions, { ordered: false });
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "DATASET_UPLOAD",
      entityType: "Dataset",
      entityId: dataset._id,
      datasetId: dataset._id,
      details: {
        name: dataset.name,
        totalRows: dataset.totalRows,
        validRows: dataset.validRows,
        totalRecordedAmount: dataset.totalRecordedAmount,
      },
    });

    res.status(201).json({
      success: true,
      message: "Dataset successfully uploaded and validated.",
      dataset,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. List datasets for authenticated user
 */
exports.getDatasets = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { owner: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { originalFilename: { $regex: search, $options: "i" } },
      ];
    }

    const datasets = await Dataset.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: datasets.length,
      datasets,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Get dataset by ID (verifying owner)
 */
exports.getDatasetById = async (req, res, next) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, owner: req.user._id });
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found or unauthorized.",
      });
    }

    // Also get quick stats
    const findingsCount = await Finding.countDocuments({ datasetId: dataset._id });
    const reconciliationsCount = await Reconciliation.countDocuments({ datasetId: dataset._id });

    res.status(200).json({
      success: true,
      dataset,
      stats: {
        findingsCount,
        reconciliationsCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Run Audit Intelligence Analysis (Duplicates + Anomalies)
 */
exports.runAnalysis = async (req, res, next) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, owner: req.user._id });
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found or unauthorized.",
      });
    }

    // Delete existing findings for this dataset to re-run fresh analysis
    await Finding.deleteMany({ datasetId: dataset._id });

    // 1. Run duplicate detection
    const duplicateCandidates = await detectDuplicates(dataset._id, req.user._id);

    // 2. Run anomaly & outlier detection
    const anomalyCandidates = await detectAnomalies(dataset._id, req.user._id);

    const allCandidates = [...duplicateCandidates, ...anomalyCandidates];

    // Generate explanations and prepare docs
    const findingDocs = [];
    for (const candidate of allCandidates) {
      const aiExp = await generateExplanation(candidate);

      findingDocs.push({
        datasetId: dataset._id,
        owner: req.user._id,
        findingId: candidate.findingId,
        title: candidate.title,
        findingType: candidate.findingType,
        severity: candidate.severity,
        explanation: candidate.explanation,
        detectionMethod: candidate.detectionMethod,
        affectedTransactions: candidate.affectedTransactions,
        sourceRowReferences: candidate.sourceRowReferences,
        amountInvolved: candidate.amountInvolved,
        comparisonValue: candidate.comparisonValue,
        confidenceScore: candidate.confidenceScore,
        metadata: candidate.metadata,
        aiExplanation: aiExp,
        reviewStatus: "Pending Review",
      });
    }

    if (findingDocs.length > 0) {
      await Finding.insertMany(findingDocs);
    }

    dataset.analysisStatus = "analyzed";
    await dataset.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "DATASET_ANALYSIS",
      entityType: "Dataset",
      entityId: dataset._id,
      datasetId: dataset._id,
      details: {
        totalFindings: findingDocs.length,
        duplicatesFound: duplicateCandidates.length,
        anomaliesFound: anomalyCandidates.length,
      },
    });

    res.status(200).json({
      success: true,
      message: `Audit analysis complete. Flagged ${findingDocs.length} potential items for review.`,
      findingsCount: findingDocs.length,
      duplicatesCount: duplicateCandidates.length,
      anomaliesCount: anomalyCandidates.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Delete dataset and cascade associated records
 */
exports.deleteDataset = async (req, res, next) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, owner: req.user._id });
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found or unauthorized.",
      });
    }

    // Cascade delete
    await Transaction.deleteMany({ datasetId: dataset._id });
    await Reconciliation.deleteMany({ datasetId: dataset._id });
    await Finding.deleteMany({ datasetId: dataset._id });
    await ReviewHistory.deleteMany({ datasetId: dataset._id });
    await Report.deleteMany({ datasetId: dataset._id });
    await Dataset.deleteOne({ _id: dataset._id });

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "DATASET_DELETE",
      entityType: "Dataset",
      entityId: dataset._id,
      details: { name: dataset.name },
    });

    res.status(200).json({
      success: true,
      message: "Dataset and all associated records deleted permanently.",
    });
  } catch (err) {
    next(err);
  }
};
