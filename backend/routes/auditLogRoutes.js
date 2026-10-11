const express = require("express");
const router = express.Router();
const auditLogController = require("../controllers/auditLogController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", auditLogController.getAuditLogs);

module.exports = router;
