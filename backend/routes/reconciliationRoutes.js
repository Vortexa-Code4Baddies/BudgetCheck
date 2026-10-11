const express = require("express");
const router = express.Router();
const reconciliationController = require("../controllers/reconciliationController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/execute", reconciliationController.executeReconciliation);
router.get("/", reconciliationController.getReconciliations);
router.get("/:id", reconciliationController.getReconciliationById);

module.exports = router;
