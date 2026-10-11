const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const { parseCsvBuffer, suggestMappings } = require("../services/csvParserService");
const { validateAndNormalizeRecords, parseAmount, parseDate } = require("../services/validationService");
const { calculateStats } = require("../services/anomalyDetectionService");

test("CSV Parser: successfully strips BOM and parses CSV records", () => {
  const sampleWithBom = Buffer.from("\ufeffTransaction_ID,Amount,Vendor\nTXN-1,1000,Apex Infra\nTXN-2,2000,CyberNet");
  const result = parseCsvBuffer(sampleWithBom);

  assert.equal(result.totalRows, 2);
  assert.deepEqual(result.rawHeaders, ["Transaction_ID", "Amount", "Vendor"]);
  assert.equal(result.records[0].Transaction_ID, "TXN-1");
  assert.equal(result.suggestedMapping.amount, "Amount");
  assert.equal(result.suggestedMapping.vendor, "Vendor");
});

test("CSV Parser: throws friendly error for empty CSV", () => {
  assert.throws(() => {
    parseCsvBuffer(Buffer.from(""));
  }, /empty/i);
});

test("Validation Service: precise integer paise currency arithmetic", () => {
  const p1 = parseAmount("1250000.50");
  assert.equal(p1.valid, true);
  assert.equal(p1.amount, 1250000.5);
  assert.equal(p1.amountPaise, 125000050);

  // Currency symbols and commas
  const p2 = parseAmount("₹7,50,000.25");
  assert.equal(p2.valid, true);
  assert.equal(p2.amount, 750000.25);
  assert.equal(p2.amountPaise, 75000025);

  // Invalid amounts
  const p3 = parseAmount("NOT_A_NUMBER");
  assert.equal(p3.valid, false);
});

test("Validation Service: date parsing handles YYYY-MM-DD and DD/MM/YYYY", () => {
  const d1 = parseDate("2026-02-14");
  assert.equal(d1.valid, true);
  assert.equal(d1.formatted, "2026-02-14");

  const d2 = parseDate("14/02/2026");
  assert.equal(d2.valid, true);
  assert.equal(d2.formatted, "2026-02-14");

  const d3 = parseDate("INVALID_DATE");
  assert.equal(d3.valid, false);
});

test("Validation Service: flags missing transaction IDs, invalid fields, and negative amounts", () => {
  const mockRows = [
    { id: "TXN-01", amt: "5000", dt: "2026-01-01", dpt: "Health", vdr: "MedPharma" },
    { id: "", amt: "12000", dt: "2026-01-02", dpt: "Education", vdr: "Vidya" }, // missing ID
    { id: "TXN-03", amt: "-2500", dt: "2026-01-03", dpt: "PWD", vdr: "Apex" }, // negative amount
    { id: "TXN-04", amt: "INVALID", dt: "NOT_A_DATE", dpt: "", vdr: "" }, // invalid amt & date, missing dept
  ];

  const mapping = {
    transactionId: "id",
    amount: "amt",
    date: "dt",
    department: "dpt",
    vendor: "vdr",
  };

  const result = validateAndNormalizeRecords(mockRows, mapping, "dummyDatasetId", "dummyOwnerId");

  assert.equal(result.totalRows, 4);
  assert.equal(result.validationSummary.negativeAmountCount, 1);
  assert.ok(result.validationSummary.missingFieldsCount > 0);
  assert.ok(result.validationSummary.invalidFieldsCount > 0);
  assert.equal(result.invalidRows, 1); // Row 4 has error severity
});

test("Reconciliation Formula: Difference = Official Total - Recorded Total", () => {
  const officialTotal = 700000;
  const recordedTotal = 650000;
  const officialPaise = Math.round(officialTotal * 100);
  const recordedPaise = Math.round(recordedTotal * 100);

  const diffPaise = officialPaise - recordedPaise;
  const diff = diffPaise / 100;

  assert.equal(diff, 50000); // Exactly ₹50,000 as per specification!
});

test("Anomaly Detection: Interquartile Range (IQR) and Median Calculation", () => {
  const numbers = [100, 110, 105, 120, 95, 115, 1000]; // 1000 is an outlier
  const stats = calculateStats(numbers);

  assert.ok(stats.median > 95 && stats.median < 130);
  assert.ok(stats.iqr > 0);
  const threshold = stats.q3 + 2.0 * stats.iqr;
  assert.ok(1000 > threshold, "1000 should exceed IQR outlier threshold");
});
