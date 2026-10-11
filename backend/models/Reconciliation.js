const mongoose = require("mongoose");

const reconciliationSchema = new mongoose.Schema(
  {
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportingPeriod: {
      type: String,
      default: "FY 2025-26",
    },
    department: {
      type: String,
      default: "All Departments",
    },
    officialTotal: {
      type: Number,
      required: true,
    },
    officialTotalPaise: {
      type: Number,
      required: true,
    },
    recordedTotal: {
      type: Number,
      required: true,
    },
    recordedTotalPaise: {
      type: Number,
      required: true,
    },
    // Difference = Official Total - Recorded Total
    difference: {
      type: Number,
      required: true,
    },
    differencePaise: {
      type: Number,
      required: true,
    },
    absoluteDifference: {
      type: Number,
      required: true,
    },
    percentageDifference: {
      type: Number,
      default: 0,
    },
    transactionsCount: {
      type: Number,
      required: true,
    },
    excludedRecordsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["matched", "discrepancy", "requires_review"],
      default: "requires_review",
    },
    explanation: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

reconciliationSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Reconciliation", reconciliationSchema);
