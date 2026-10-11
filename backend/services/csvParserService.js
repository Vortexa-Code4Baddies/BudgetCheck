const { parse } = require("csv-parse/sync");

/**
 * Remove UTF-8 BOM if present
 */
const stripBom = (buffer) => {
  let content = buffer.toString("utf8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Normalize header name for matching
 */
const cleanHeader = (header) => {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/^_+|_+$/g, "");
};

/**
 * Suggest standard field mapping from CSV headers
 */
const suggestMappings = (headers) => {
  const mapping = {
    transactionId: "",
    date: "",
    department: "",
    category: "",
    description: "",
    vendor: "",
    amount: "",
    paymentReference: "",
    status: "",
  };

  const patterns = {
    transactionId: ["transaction_id", "txnid", "txn_id", "id", "reference_id", "voucher_no", "voucher", "trans_id"],
    date: ["date", "transaction_date", "txn_date", "payment_date", "posted_date", "trans_date"],
    department: ["department", "dept", "ministry", "agency", "division", "secretariat"],
    category: ["category", "expense_head", "budget_head", "classification", "type", "head"],
    description: ["description", "particulars", "purpose", "details", "item", "narration", "remarks"],
    vendor: ["vendor", "payee", "beneficiary", "supplier", "contractor", "party", "receiver"],
    amount: ["amount", "total", "expenditure", "disbursement", "debit", "sum", "value", "net_amount"],
    paymentReference: ["payment_reference", "payment_ref", "utr", "ref_no", "reference", "cheque_no", "challan"],
    status: ["status", "payment_status", "state", "txn_status"],
  };

  for (const rawHeader of headers) {
    const cleaned = cleanHeader(rawHeader);

    for (const [field, synonyms] of Object.entries(patterns)) {
      if (!mapping[field]) {
        for (const syn of synonyms) {
          if (cleaned === syn || cleaned.includes(syn)) {
            mapping[field] = rawHeader;
            break;
          }
        }
      }
    }
  }

  return mapping;
};

/**
 * Parse CSV buffer into rows and header metadata
 */
const parseCsvBuffer = (buffer) => {
  const content = stripBom(buffer);

  if (!content.trim()) {
    throw new Error("Uploaded CSV file is empty.");
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  if (!records || records.length === 0) {
    throw new Error("No data rows found in the CSV file.");
  }

  const rawHeaders = Object.keys(records[0] || {});
  const suggestedMapping = suggestMappings(rawHeaders);

  return {
    rawHeaders,
    suggestedMapping,
    records,
    totalRows: records.length,
  };
};

module.exports = {
  parseCsvBuffer,
  suggestMappings,
  cleanHeader,
};
