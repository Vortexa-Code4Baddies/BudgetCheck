const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["Dataset", "Transaction", "Reconciliation", "Finding", "Report", "User", "Auth"],
      required: true,
    },
    entityId: {
      type: String,
      default: "",
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      index: true,
    },
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ datasetId: 1, timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
