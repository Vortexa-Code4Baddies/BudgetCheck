const mongoose = require("mongoose");

const findingSchema = new mongoose.Schema(
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
    findingId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    findingType: {
      type: String,
      enum: [
        "duplicate_exact",
        "duplicate_possible",
        "unusual_amount_outlier",
        "category_deviation",
        "rapid_payments",
        "missing_critical_data",
        "negative_reversal",
        "reconciliation_discrepancy",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    explanation: {
      type: String,
      required: true,
    },
    detectionMethod: {
      type: String,
      required: true,
    },
    affectedTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],
    sourceRowReferences: [{ type: Number }],
    amountInvolved: {
      type: Number,
      default: 0,
    },
    comparisonValue: {
      type: Number,
      default: null,
    },
    confidenceScore: {
      type: Number, // e.g. 1.0 for exact, 0.85 for possible
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiExplanation: {
      type: String,
      default: "",
    },
    reviewStatus: {
      type: String,
      enum: [
        "Pending Review",
        "Under Investigation",
        "Confirmed Issue",
        "Dismissed",
        "Resolved",
      ],
      default: "Pending Review",
    },
    reviewNotes: {
      type: String,
      default: "",
    },
    resolutionReason: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

findingSchema.index({ datasetId: 1, reviewStatus: 1 });
findingSchema.index({ owner: 1, reviewStatus: 1 });
findingSchema.index({ datasetId: 1, findingType: 1 });
findingSchema.index({ datasetId: 1, severity: 1 });

module.exports = mongoose.model("Finding", findingSchema);
