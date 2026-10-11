const AuditLog = require("../models/AuditLog");

exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 30,
      action = "",
      entityType = "",
      datasetId = "",
      search = "",
    } = req.query;

    const query = {};

    // Normal auditors only see their own logs; admins can see all or own
    if (req.user.role !== "admin") {
      query.actor = req.user._id;
    }

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (datasetId) query.datasetId = datasetId;

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { entityType: { $regex: search, $options: "i" } },
        { actorName: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate("datasetId", "name")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      logs,
    });
  } catch (err) {
    next(err);
  }
};
