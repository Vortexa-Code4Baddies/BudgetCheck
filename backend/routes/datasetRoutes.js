const express = require("express");
const router = express.Router();
const datasetController = require("../controllers/datasetController");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authenticate);

router.post("/upload", upload.single("file"), datasetController.parseUpload);
router.post("/save", datasetController.saveDataset);
router.get("/", datasetController.getDatasets);
router.get("/:id", datasetController.getDatasetById);
router.post("/:id/analyze", datasetController.runAnalysis);
router.delete("/:id", datasetController.deleteDataset);

module.exports = router;
