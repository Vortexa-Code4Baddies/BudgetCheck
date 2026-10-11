const AuditLog = require("../models/AuditLog");

const logAuditEvent = async ({
  actorId,
  actorName = "System",
  action,
  entityType,
  entityId = "",
  datasetId = null,
  details = {},
  ipAddress = "127.0.0.1",
}) => {
  try {
    await AuditLog.create({
      actor: actorId,
      actorName,
      action,
      entityType,
      entityId: String(entityId),
      datasetId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
};

module.exports = { logAuditEvent };
