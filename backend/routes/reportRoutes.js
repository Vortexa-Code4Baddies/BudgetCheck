const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/generate", reportController.generateReport);
router.get("/", reportController.getReports);
router.get("/:id/download", reportController.downloadReport);

module.exports = router;
