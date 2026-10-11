/**
 * Validate and normalize CSV records based on column mapping
 */

const parseAmount = (val) => {
  if (val === undefined || val === null || String(val).trim() === "") {
    return { valid: false, amount: 0, amountPaise: 0, raw: val };
  }

  // Remove commas, currency symbols like ₹, $, spaces
  const cleaned = String(val).replace(/₹|,|\$|\s/g, "").trim();
  const num = Number(cleaned);

  if (isNaN(num)) {
    return { valid: false, amount: 0, amountPaise: 0, raw: val };
  }

  // Exact integer paise
  const amountPaise = Math.round(num * 100);
  return { valid: true, amount: num, amountPaise, raw: val };
};

const parseDate = (val) => {
  if (!val || String(val).trim() === "") {
    return { valid: false, formatted: "", parsedDate: null };
  }

  const str = String(val).trim();
  const d = new Date(str);

  if (isNaN(d.getTime())) {
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const parsed = new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`);
      if (!isNaN(parsed.getTime())) {
        return {
          valid: true,
          formatted: parsed.toISOString().split("T")[0],
          parsedDate: parsed,
        };
      }
    }
    return { valid: false, formatted: str, parsedDate: null };
  }

  return {
    valid: true,
    formatted: d.toISOString().split("T")[0],
    parsedDate: d,
  };
};

const validateAndNormalizeRecords = (rawRecords, mapping, datasetId, ownerId) => {
  const normalizedTransactions = [];
  const validationIssues = [];
  const seenTxnIds = new Set();
  const duplicateTxnIds = new Set();

  let missingFieldsCount = 0;
  let invalidFieldsCount = 0;
  let negativeAmountCount = 0;
  let validRows = 0;
  let invalidRows = 0;
  let totalAmountPaise = 0;

  rawRecords.forEach((record, index) => {
    const rowNumber = index + 2; // 1-based index including header row
    const errors = [];

    // Extract values based on mapping
    const rawTxnId = mapping.transactionId ? record[mapping.transactionId] : "";
    const rawDate = mapping.date ? record[mapping.date] : "";
    const rawDept = mapping.department ? record[mapping.department] : "";
    const rawCategory = mapping.category ? record[mapping.category] : "";
    const rawDesc = mapping.description ? record[mapping.description] : "";
    const rawVendor = mapping.vendor ? record[mapping.vendor] : "";
    const rawAmount = mapping.amount ? record[mapping.amount] : "";
    const rawPayRef = mapping.paymentReference ? record[mapping.paymentReference] : "";
    const rawStatus = mapping.status ? record[mapping.status] : "Completed";

    // 1. Transaction ID check
    let txnId = String(rawTxnId || "").trim();
    if (!txnId) {
      errors.push({
        field: "transactionId",
        message: "Missing transaction identifier.",
        severity: "warning",
      });
      missingFieldsCount++;
      txnId = `ROW-${rowNumber}`;
    } else {
      if (seenTxnIds.has(txnId)) {
        duplicateTxnIds.add(txnId);
        errors.push({
          field: "transactionId",
          message: `Duplicate transaction ID found: "${txnId}".`,
          severity: "warning",
        });
      } else {
        seenTxnIds.add(txnId);
      }
    }

    // 2. Date check
    const dateCheck = parseDate(rawDate);
    if (!rawDate) {
      errors.push({
        field: "date",
        message: "Missing transaction date.",
        severity: "warning",
      });
      missingFieldsCount++;
    } else if (!dateCheck.valid) {
      errors.push({
        field: "date",
        message: `Invalid date format: "${rawDate}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
        severity: "error",
      });
      invalidFieldsCount++;
    }

    // 3. Amount check
    const amountCheck = parseAmount(rawAmount);
    if (rawAmount === undefined || rawAmount === null || String(rawAmount).trim() === "") {
      errors.push({
        field: "amount",
        message: "Missing transaction amount.",
        severity: "error",
      });
      missingFieldsCount++;
    } else if (!amountCheck.valid) {
      errors.push({
        field: "amount",
        message: `Invalid numeric amount value: "${rawAmount}".`,
        severity: "error",
      });
      invalidFieldsCount++;
    } else if (amountCheck.amount < 0) {
      negativeAmountCount++;
      errors.push({
        field: "amount",
        message: `Negative expenditure amount detected (₹${amountCheck.amount}). May represent a credit note, refund, or reversal.`,
        severity: "warning",
      });
    }

    // 4. Department check
    const dept = String(rawDept || "").trim();
    if (!dept) {
      errors.push({
        field: "department",
        message: "Missing department / ministry classification.",
        severity: "warning",
      });
      missingFieldsCount++;
    }

    // 5. Category check
    const cat = String(rawCategory || "").trim();
    if (!cat) {
      errors.push({
        field: "category",
        message: "Missing expenditure category / budget head.",
        severity: "warning",
      });
      missingFieldsCount++;
    }

    // 6. Payment reference check
    const payRef = String(rawPayRef || "").trim();
    if (!payRef && amountCheck.valid && amountCheck.amount > 100000) {
      errors.push({
        field: "paymentReference",
        message: "Missing payment reference / UTR on high-value transaction (> ₹1,00,000).",
        severity: "warning",
      });
      missingFieldsCount++;
    }

    const hasErrors = errors.some((e) => e.severity === "error");
    if (hasErrors) {
      invalidRows++;
    } else {
      validRows++;
    }

    if (errors.length > 0) {
      errors.forEach((err) => {
        validationIssues.push({
          rowNumber,
          field: err.field,
          issueType: err.severity,
          message: err.message,
          severity: err.severity,
        });
      });
    }

    if (amountCheck.valid) {
      totalAmountPaise += amountCheck.amountPaise;
    }

    normalizedTransactions.push({
      datasetId,
      owner: ownerId,
      sourceRowNumber: rowNumber,
      originalValues: record,
      transactionId: txnId,
      date: dateCheck.formatted || (rawDate ? String(rawDate) : ""),
      dateParsed: dateCheck.parsedDate,
      department: dept || "Unassigned",
      category: cat || "General Expenditure",
      description: String(rawDesc || "").trim(),
      vendor: String(rawVendor || "").trim() || "Unspecified Vendor",
      amount: amountCheck.amount,
      amountPaise: amountCheck.amountPaise,
      paymentReference: payRef,
      status: String(rawStatus || "Completed").trim(),
      isValid: !hasErrors,
      validationErrors: errors,
    });
  });

  const totalRecordedAmount = totalAmountPaise / 100;

  return {
    normalizedTransactions,
    validationSummary: {
      missingFieldsCount,
      invalidFieldsCount,
      duplicateIdCount: duplicateTxnIds.size,
      negativeAmountCount,
      issues: validationIssues.slice(0, 100), // preserve top 100 for fast UI display
    },
    validRows,
    invalidRows,
    totalRows: rawRecords.length,
    totalRecordedAmount,
    totalAmountPaise,
  };
};

module.exports = {
  validateAndNormalizeRecords,
  parseAmount,
  parseDate,
};
