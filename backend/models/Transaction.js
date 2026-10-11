const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
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
    sourceRowNumber: {
      type: Number,
      required: true,
    },
    originalValues: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Normalized fields
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    date: {
      type: String, // YYYY-MM-DD format
      default: "",
    },
    dateParsed: {
      type: Date,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: "Unassigned",
    },
    category: {
      type: String,
      trim: true,
      default: "General Expenditure",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    vendor: {
      type: String,
      trim: true,
      default: "Unknown Payee",
    },
    amount: {
      type: Number,
      default: 0,
    },
    amountPaise: {
      type: Number, // Integer paise for 100% exact currency arithmetic without IEEE 754 float drift
      default: 0,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      trim: true,
      default: "Completed",
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    validationErrors: [
      {
        field: String,
        message: String,
        severity: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ datasetId: 1, sourceRowNumber: 1 });
transactionSchema.index({ datasetId: 1, vendor: 1, amountPaise: 1 });
transactionSchema.index({ datasetId: 1, department: 1 });
transactionSchema.index({ datasetId: 1, category: 1 });
transactionSchema.index({ datasetId: 1, transactionId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
