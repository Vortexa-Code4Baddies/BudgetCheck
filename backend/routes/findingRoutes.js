const express = require("express");
const router = express.Router();
const findingController = require("../controllers/findingController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", findingController.getFindings);
router.get("/:id", findingController.getFindingById);
router.get("/:id/ai-explanation", findingController.getAiExplanation);

module.exports = router;
