const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generate a professional audit intelligence PDF report
 */
const generatePdfReport = async ({
  dataset,
  reconciliation,
  findings = [],
  transactions = [],
  reviewerName = "Authorized Auditor",
  reportType = "Comprehensive Audit",
  outputPath,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 45, left: 45, right: 45 },
        bufferPages: true,
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = "#0f172a"; // Deep navy
      const accentTeal = "#0d9488"; // Teal
      const darkSlate = "#334155";
      const lightBg = "#f8fafc";
      const borderGray = "#cbd5e1";
      const alertRed = "#dc2626";
      const alertAmber = "#d97706";

      // Header Banner
      doc
        .rect(45, 40, 505, 55)
        .fill(primaryColor);

      doc
        .fillColor("#ffffff")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("FISCORA", 60, 50);

      doc
        .fontSize(9)
        .font("Helvetica")
        .text("PUBLIC SPENDING RECONCILIATION & AUDIT INTELLIGENCE", 60, 72);

      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(`Report Type: ${reportType.toUpperCase()}`, 380, 52, { align: "right" })
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`, 380, 68, { align: "right" });

      doc.moveDown(3);

      // Document Title
      doc
        .fillColor(primaryColor)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(`Expenditure Audit & Reconciliation Report: ${dataset.name}`, 45, 110);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(darkSlate)
        .text(`Dataset File: ${dataset.originalFilename}  |  Period: ${dataset.reportingPeriod || "FY 2025-26"}  |  Lead Auditor: ${reviewerName}`, 45, 130);

      doc.moveDown(1.5);

      // SECTION 1: EXECUTIVE KPI SUMMARY BOXES
      const startY = 155;
      const boxWidth = 118;
      const boxHeight = 55;
      const gap = 11;

      const recTotal = dataset.totalRecordedAmount || 0;
      const offTotal = reconciliation ? reconciliation.officialTotal : 0;
      const diff = reconciliation ? reconciliation.difference : 0;
      const totalFnd = findings.length;

      const kpis = [
        { label: "RECORDED TOTAL", val: `INR ${(recTotal / 100000).toFixed(2)}L`, sub: `${dataset.totalRows} Records`, color: primaryColor },
        { label: "OFFICIAL BUDGET", val: offTotal ? `INR ${(offTotal / 100000).toFixed(2)}L` : "Not Supplied", sub: reconciliation?.status || "Pending", color: accentTeal },
        { label: "RECON. VARIANCE", val: offTotal ? `INR ${(diff / 100000).toFixed(2)}L` : "N/A", sub: reconciliation ? `${reconciliation.percentageDifference}% diff` : "N/A", color: Math.abs(diff) > 0 ? alertRed : accentTeal },
        { label: "FLAGGED FINDINGS", val: `${totalFnd} Items`, sub: `${findings.filter((f) => f.reviewStatus === "Confirmed Issue").length} Confirmed`, color: totalFnd > 0 ? alertAmber : accentTeal },
      ];

      kpis.forEach((kpi, idx) => {
        const bx = 45 + idx * (boxWidth + gap);
        doc.rect(bx, startY, boxWidth, boxHeight).fillAndStroke(lightBg, borderGray);
        doc.fillColor(darkSlate).fontSize(7).font("Helvetica-Bold").text(kpi.label, bx + 8, startY + 8);
        doc.fillColor(kpi.color).fontSize(11).font("Helvetica-Bold").text(kpi.val, bx + 8, startY + 22);
        doc.fillColor("#64748b").fontSize(7).font("Helvetica").text(kpi.sub, bx + 8, startY + 38);
      });

      doc.y = startY + boxHeight + 20;

      // SECTION 2: DATA INTEGRITY & VALIDATION SUMMARY
      doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("1. Data Health & Parsing Validation");
      doc.moveDown(0.4);

      const valSummary = dataset.validationSummary || {};
      doc.fontSize(8.5).font("Helvetica").fillColor(darkSlate);
      doc.text(
        `Analysis of ${dataset.totalRows} raw input records identified ${dataset.validRows} fully compliant rows and ${dataset.invalidRows} records with data-quality notices. Missing fields: ${valSummary.missingFieldsCount || 0}, Invalid values: ${valSummary.invalidFieldsCount || 0}, Duplicate transaction IDs: ${valSummary.duplicateIdCount || 0}, Negative values / Reversals: ${valSummary.negativeAmountCount || 0}.`
      );

      doc.moveDown(1);

      // SECTION 3: RECONCILIATION FINDINGS
      doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("2. Official vs Recorded Financial Reconciliation");
      doc.moveDown(0.4);

      if (reconciliation) {
        doc.fontSize(8.5).font("Helvetica").fillColor(darkSlate);
        doc.text(
          `Official figure provided: INR ${reconciliation.officialTotal.toLocaleString("en-IN")}\n` +
          `Recorded expenditure calculated: INR ${reconciliation.recordedTotal.toLocaleString("en-IN")}\n` +
          `Variance (Official - Recorded): INR ${reconciliation.difference.toLocaleString("en-IN")} (${reconciliation.percentageDifference}%)\n` +
          `Reconciliation Status: ${reconciliation.status.toUpperCase()} — ${reconciliation.explanation}`
        );
      } else {
        doc.fontSize(8.5).font("Helvetica-Oblique").fillColor("#64748b").text("No formal reconciliation benchmark figure has been submitted for this dataset yet.");
      }

      doc.moveDown(1.2);

      // SECTION 4: KEY AUDIT FINDINGS TABLE
      doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("3. Flagged Audit Findings & Candidate Irregularities");
      doc.moveDown(0.5);

      if (findings.length === 0) {
        doc.fontSize(9).font("Helvetica-Oblique").fillColor("#10b981").text("No duplicate candidates or anomalous transactions were flagged under current criteria.");
      } else {
        // Table Header
        let tableY = doc.y;
        doc.rect(45, tableY, 505, 18).fill("#e2e8f0");
        doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold");
        doc.text("ID", 50, tableY + 5);
        doc.text("FINDING / TITLE", 110, tableY + 5);
        doc.text("TYPE", 280, tableY + 5);
        doc.text("AMOUNT", 365, tableY + 5);
        doc.text("SEVERITY", 425, tableY + 5);
        doc.text("STATUS", 480, tableY + 5);

        tableY += 20;

        findings.slice(0, 15).forEach((fnd, idx) => {
          // Check page overflow
          if (tableY > 720) {
            doc.addPage();
            tableY = 50;
            // Draw table header again
            doc.rect(45, tableY, 505, 18).fill("#e2e8f0");
            doc.fillColor(primaryColor).fontSize(7.5).font("Helvetica-Bold");
            doc.text("ID", 50, tableY + 5);
            doc.text("FINDING / TITLE", 110, tableY + 5);
            doc.text("TYPE", 280, tableY + 5);
            doc.text("AMOUNT", 365, tableY + 5);
            doc.text("SEVERITY", 425, tableY + 5);
            doc.text("STATUS", 480, tableY + 5);
            tableY += 20;
          }

          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          doc.rect(45, tableY, 505, 18).fill(rowBg);

          doc.fillColor(darkSlate).fontSize(7).font("Helvetica");
          doc.text(fnd.findingId || `FND-${idx + 1}`, 50, tableY + 5);
          doc.font("Helvetica-Bold").text((fnd.title || "").slice(0, 32), 110, tableY + 5);
          doc.font("Helvetica").text(fnd.findingType, 280, tableY + 5);
          doc.text(fnd.amountInvolved ? `INR ${Number(fnd.amountInvolved).toLocaleString("en-IN")}` : "-", 365, tableY + 5);

          // Severity color
          let sevColor = darkSlate;
          if (fnd.severity === "critical") sevColor = alertRed;
          else if (fnd.severity === "high") sevColor = alertRed;
          else if (fnd.severity === "medium") sevColor = alertAmber;
          else sevColor = "#16a34a";

          doc.fillColor(sevColor).font("Helvetica-Bold").text(fnd.severity.toUpperCase(), 425, tableY + 5);
          doc.fillColor(darkSlate).font("Helvetica").text(fnd.reviewStatus || "Pending", 480, tableY + 5);

          tableY += 19;
        });

        doc.y = tableY + 10;
      }

      // Check page break before methodology & disclaimer
      if (doc.y > 660) {
        doc.addPage();
      }

      doc.moveDown(1);
      doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("4. Audit Methodology & Detection Parameters");
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor(darkSlate).text(
        "Detection algorithms utilized: (1) Exact tuple collision on Payee, Date, and Amount; (2) Time-windowed fuzzy matching for near-date duplicate candidates; (3) Non-parametric statistical distribution profiling using Interquartile Range (IQR) and Median Absolute Deviation (MAD); (4) Integer paise fixed-point arithmetic for zero-drift financial reconciliation."
      );

      doc.moveDown(1);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("5. Professional Disclaimer & Limitations");
      doc.moveDown(0.3);
      doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#64748b").text(
        "Fiscora is an automated financial screening and audit intelligence support system. Findings flagged in this report represent candidates for human review, potential procedural irregularities, or data anomalies. They do NOT constitute a legal determination of fraud, corruption, or statutory non-compliance without on-ground physical inspection and formal departmental inquiry."
      );

      // Sign-off section
      doc.moveDown(1.5);
      if (doc.y > 700) doc.addPage();
      const signY = doc.y;
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("Prepared By:", 45, signY);
      doc.text("Verified & Approved By:", 350, signY);

      doc.font("Helvetica").fillColor(darkSlate);
      doc.text(`Auditor: ${reviewerName}`, 45, signY + 12);
      doc.text("Principal Audit Officer / DDO", 350, signY + 12);
      doc.text("Public Accounts Directorate", 45, signY + 24);
      doc.text("State Treasury Oversight Board", 350, signY + 24);

      // Page numbers across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).font("Helvetica").fillColor("#94a3b8").text(
          `Fiscora Audit Intelligence Platform  •  Page ${i + 1} of ${range.count}  •  Strictly Confidential`,
          45,
          800,
          { align: "center", width: 505 }
        );
      }

      doc.end();

      writeStream.on("finish", () => {
        const stats = fs.statSync(outputPath);
        resolve({
          filePath: outputPath,
          fileSize: stats.size,
        });
      });

      writeStream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generatePdfReport,
};
