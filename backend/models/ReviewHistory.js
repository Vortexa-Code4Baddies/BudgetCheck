const mongoose = require("mongoose");

const reviewHistorySchema = new mongoose.Schema(
  {
    findingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Finding",
      required: true,
      index: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewerName: {
      type: String,
      default: "Auditor",
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    actionTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

reviewHistorySchema.index({ findingId: 1, actionTimestamp: -1 });

module.exports = mongoose.model("ReviewHistory", reviewHistorySchema);
