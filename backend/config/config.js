const dotenv = require("dotenv");

dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  MONGO_URI:
    process.env.MONGO_URI ||
    "mongodb+srv://anikawpatil_db_user:1234@cluster0.xlauogq.mongodb.net/budgetcheck",
  JWT_SECRET: process.env.JWT_SECRET || "fiscora_default_jwt_secret_audit_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
  AI_PROVIDER: process.env.AI_PROVIDER || "rule_based",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ROWS: 50000,
};

module.exports = config;