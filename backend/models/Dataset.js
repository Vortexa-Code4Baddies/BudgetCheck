const mongoose = require("mongoose");

const datasetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Dataset name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
    originalFilename: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    columnMapping: {
      transactionId: { type: String, default: "" },
      date: { type: String, default: "" },
      department: { type: String, default: "" },
      category: { type: String, default: "" },
      description: { type: String, default: "" },
      vendor: { type: String, default: "" },
      amount: { type: String, default: "" },
      paymentReference: { type: String, default: "" },
      status: { type: String, default: "" },
    },
    rawHeaders: [{ type: String }],
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    totalRecordedAmount: { type: Number, default: 0 }, // in INR
    totalAmountPaise: { type: Number, default: 0 }, // integer paise
    validationSummary: {
      missingFieldsCount: { type: Number, default: 0 },
      invalidFieldsCount: { type: Number, default: 0 },
      duplicateIdCount: { type: Number, default: 0 },
      negativeAmountCount: { type: Number, default: 0 },
      issues: [
        {
          rowNumber: Number,
          field: String,
          issueType: String,
          message: String,
          severity: { type: String, enum: ["warning", "error"], default: "warning" },
        },
      ],
    },
    analysisStatus: {
      type: String,
      enum: ["uploaded", "mapped", "analyzed", "failed"],
      default: "uploaded",
    },
    reportingPeriod: {
      type: String,
      default: "FY 2025-26",
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

datasetSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Dataset", datasetSchema);
