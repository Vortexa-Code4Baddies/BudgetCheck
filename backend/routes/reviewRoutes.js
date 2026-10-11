const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.put("/findings/:id", reviewController.updateFindingReview);
router.get("/findings/:id/history", reviewController.getReviewHistoryForFinding);

module.exports = router;
