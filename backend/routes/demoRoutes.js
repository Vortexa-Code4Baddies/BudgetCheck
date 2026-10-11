const express = require("express");
const router = express.Router();
const demoController = require("../controllers/demoController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/load", demoController.loadDemoDataset);

module.exports = router;
