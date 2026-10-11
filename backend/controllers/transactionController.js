const Transaction = require("../models/Transaction");
const Dataset = require("../models/Dataset");

exports.getTransactions = async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    const {
      page = 1,
      limit = 25,
      search = "",
      department = "",
      category = "",
      isValid = "",
      sortBy = "sourceRowNumber",
      sortOrder = "asc",
    } = req.query;

    const dataset = await Dataset.findOne({ _id: datasetId, owner: req.user._id });
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found or unauthorized.",
      });
    }

    const query = { datasetId, owner: req.user._id };

    if (department) query.department = department;
    if (category) query.category = category;
    if (isValid !== "") query.isValid = isValid === "true";

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { vendor: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { paymentReference: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get unique departments & categories for filters
    const departments = await Transaction.distinct("department", { datasetId });
    const categories = await Transaction.distinct("category", { datasetId });

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      departments,
      categories,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found or unauthorized.",
      });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};
