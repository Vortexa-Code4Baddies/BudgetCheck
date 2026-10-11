const config = require("../config/config");
const axios = require("axios");

/**
 * Generate auditor-grade explanation for a finding
 */
const generateExplanation = async (finding, transactionDetails = []) => {
  // Check if external AI provider is configured
  if (config.OPENAI_API_KEY && config.AI_PROVIDER === "openai") {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert government financial auditor. Provide concise, factual, objective audit explanations without claiming fraud or legal wrongdoing. Structure output with: 1. Risk Summary, 2. Questions for Reviewer, 3. Recommended Audit Action.",
            },
            {
              role: "user",
              content: `Analyze this public audit finding:\nTitle: ${finding.title}\nType: ${finding.findingType}\nSeverity: ${finding.severity}\nExplanation: ${finding.explanation}\nAmount Involved: ₹${finding.amountInvolved}\nSupporting Transactions: ${JSON.stringify(transactionDetails.slice(0, 5))}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 350,
        },
        {
          headers: {
            Authorization: `Bearer ${config.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 7000,
        }
      );

      const aiText = response.data?.choices?.[0]?.message?.content;
      if (aiText) return aiText.trim();
    } catch (err) {
      console.warn("External OpenAI call skipped/failed, falling back to deterministic explanation engine:", err.message);
    }
  }

  // Deterministic, explainable rule-based explanation engine (always reliable & offline-ready)
  const amountStr = finding.amountInvolved
    ? `₹${Number(finding.amountInvolved).toLocaleString("en-IN")}`
    : "Unspecified Amount";

  const rowsStr = (finding.sourceRowReferences || []).join(", ");

  let riskCategory = "Expenditure Verification";
  let questions = [];
  let action = "Request departmental sanction file and original tax invoices.";

  switch (finding.findingType) {
    case "duplicate_exact":
      riskCategory = "Double Disbursement Risk";
      questions = [
        "Was this voucher processed twice due to an ERP re-submission or network timeout?",
        "Do bank payment scrolls show two distinct debit transactions or a single consolidated batch?",
        "Has the vendor acknowledged receiving two payments, or was one reversed automatically?",
      ];
      action = "Cross-check treasury scroll UTR with State Bank of India portal and request vendor statement of accounts.";
      break;

    case "duplicate_possible":
      riskCategory = "Near-Date Duplicate or Phased Milestone Risk";
      questions = [
        "Do these transactions correspond to separate contractual milestones or duplicate billing of the same scope?",
        "Are work measurement books (MB) signed by the junior engineer for both payment dates?",
        "Was an initial advance payment followed by an unadjusted final bill?",
      ];
      action = "Examine measurement book entries and verify whether separate purchase orders exist.";
      break;

    case "unusual_amount_outlier":
      riskCategory = "Materiality Outlier & Fiscal Deviation";
      questions = [
        "Does this expenditure have prior cabinet / administrative approval from the competent financial authority?",
        "Did competitive open tendering take place as required by General Financial Rules (GFR)?",
        "Why does this amount exceed the typical expenditure range of comparable departmental orders?",
      ];
      action = "Retrieve e-procurement tender comparative statement and verify delegation of financial powers.";
      break;

    case "negative_reversal":
      riskCategory = "Negative Entry / Journal Rectification";
      questions = [
        "What was the voucher number of the original erroneous debit that necessitated this reversal?",
        "Was interest or penalty charged for the delayed correction?",
        "Was this reversal authorized by the drawing and disbursing officer (DDO)?",
      ];
      action = "Inspect transfer entry (TE) order and verify refund credit in treasury ledger.";
      break;

    case "missing_critical_data":
      riskCategory = "Compliance and Audit Trail Deficiency";
      questions = [
        "Why was the RTGS UTR / bank reference omitted from the financial payment schedule?",
        "Can the treasury officer supply the manual scroll reference for this disbursement?",
      ];
      action = "Reconcile with monthly bank passbook and mandate submission of payment receipt voucher.";
      break;

    default:
      riskCategory = "Fiscal Oversight Candidate";
      questions = [
        "Does the physical asset or delivered service exist on ground at the site?",
        "Are stock register entries corroborated by storekeeper receipts?",
      ];
      action = "Conduct physical spot-verification and audit against departmental asset register.";
  }

  return `### 🔍 Audit Intelligence Summary (${riskCategory})
**Affected Amount:** ${amountStr} | **Source Rows:** [${rowsStr}]

**Key Audit Questions for Investigation:**
1. ${questions[0]}
2. ${questions[1]}
${questions[2] ? `3. ${questions[2]}` : ""}

**Recommended Reviewer Action:**
${action}

*(Generated by Fiscora Rule-Based Audit Intelligence Engine - Deterministic & Evidence-Linked)*`;
};

module.exports = {
  generateExplanation,
};
