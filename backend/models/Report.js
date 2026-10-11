const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
      index: true,
    },
    datasetName: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: ["Comprehensive Audit", "Reconciliation Summary", "Anomaly & Duplicates"],
      default: "Comprehensive Audit",
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    generationStatus: {
      type: String,
      enum: ["completed", "generating", "failed"],
      default: "completed",
    },
    summarySnapshot: {
      totalRecorded: Number,
      officialTotal: Number,
      reconciliationDifference: Number,
      totalTransactions: Number,
      totalFindings: Number,
      duplicatesCount: Number,
      anomaliesCount: Number,
      reviewedCount: Number,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
