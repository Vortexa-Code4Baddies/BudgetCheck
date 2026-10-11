const fs = require("fs");
const path = require("path");
const Dataset = require("../models/Dataset");
const Transaction = require("../models/Transaction");
const Reconciliation = require("../models/Reconciliation");
const Finding = require("../models/Finding");
const { parseCsvBuffer } = require("../services/csvParserService");
const { validateAndNormalizeRecords } = require("../services/validationService");
const { detectDuplicates } = require("../services/duplicateDetectionService");
const { detectAnomalies } = require("../services/anomalyDetectionService");
const { reconcileExpenditure } = require("../services/reconciliationService");
const { generateExplanation } = require("../services/aiExplanationService");
const { logAuditEvent } = require("../services/auditLogService");

exports.loadDemoDataset = async (req, res, next) => {
  try {
    const csvPath = path.join(__dirname, "../../sample_data/sample_expenditure.csv");

    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({
        success: false,
        message: "Sample dataset file not found on server.",
      });
    }

    const fileBuffer = fs.readFileSync(csvPath);
    const { rawHeaders, suggestedMapping, records } = parseCsvBuffer(fileBuffer);

    const demoDatasetName = `Fiscora State Expenditure Demonstration (Q4)`;

    // Check if user already loaded it recently
    const existing = await Dataset.findOne({
      name: demoDatasetName,
      owner: req.user._id,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Demonstration dataset already loaded in your workspace.",
        dataset: existing,
      });
    }

    // Create Dataset
    const dataset = new Dataset({
      name: demoDatasetName,
      originalFilename: "sample_expenditure.csv",
      owner: req.user._id,
      columnMapping: suggestedMapping,
      rawHeaders,
      totalRows: records.length,
      reportingPeriod: "FY 2025-26 Q4",
      notes: "Pre-loaded demonstration dataset representing multi-department state expenditures with intentional audit anomalies, duplicate candidates, and reconciliation variance.",
      analysisStatus: "uploaded",
    });

    // Validate & normalize
    const {
      normalizedTransactions,
      validationSummary,
      validRows,
      invalidRows,
      totalRecordedAmount,
      totalAmountPaise,
    } = validateAndNormalizeRecords(records, suggestedMapping, dataset._id, req.user._id);

    dataset.validationSummary = validationSummary;
    dataset.validRows = validRows;
    dataset.invalidRows = invalidRows;
    dataset.totalRecordedAmount = totalRecordedAmount;
    dataset.totalAmountPaise = totalAmountPaise;

    await dataset.save();

    // Insert transactions
    await Transaction.insertMany(normalizedTransactions);

    // Run audit analysis (duplicates + anomalies)
    const duplicates = await detectDuplicates(dataset._id, req.user._id);
    const anomalies = await detectAnomalies(dataset._id, req.user._id);
    const allFindings = [...duplicates, ...anomalies];

    const findingDocs = [];
    for (const f of allFindings) {
      const explanation = await generateExplanation(f);
      findingDocs.push({
        datasetId: dataset._id,
        owner: req.user._id,
        findingId: f.findingId,
        title: f.title,
        findingType: f.findingType,
        severity: f.severity,
        explanation: f.explanation,
        detectionMethod: f.detectionMethod,
        affectedTransactions: f.affectedTransactions,
        sourceRowReferences: f.sourceRowReferences,
        amountInvolved: f.amountInvolved,
        comparisonValue: f.comparisonValue,
        confidenceScore: f.confidenceScore,
        metadata: f.metadata,
        aiExplanation: explanation,
        reviewStatus: "Pending Review",
      });
    }

    if (findingDocs.length > 0) {
      await Finding.insertMany(findingDocs);
    }

    dataset.analysisStatus = "analyzed";
    await dataset.save();

    // Automatically run initial reconciliation with official state budget ₹3,20,00,000
    await reconcileExpenditure({
      datasetId: dataset._id,
      ownerId: req.user._id,
      officialTotal: 32000000,
      reportingPeriod: "FY 2025-26 Q4",
      department: "All Departments",
      notes: "State Treasury Q4 Official Audited Allocation baseline",
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "DEMO_DATASET_LOAD",
      entityType: "Dataset",
      entityId: dataset._id,
      datasetId: dataset._id,
      details: {
        name: dataset.name,
        rows: records.length,
        findingsCount: findingDocs.length,
      },
    });

    res.status(201).json({
      success: true,
      message: "Demonstration dataset, transactions, analysis, and reconciliation loaded successfully!",
      dataset,
      findingsCount: findingDocs.length,
    });
  } catch (err) {
    next(err);
  }
};
