const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/config");
const { logAuditEvent } = require("../services/auditLogService");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = generateToken(user._id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("fiscora_token", token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
      createdAt: user.createdAt,
    },
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === "admin" ? "admin" : "auditor",
      organization: organization || "State Audit Department",
    });

    await logAuditEvent({
      actorId: user._id,
      actorName: user.name,
      action: "USER_REGISTER",
      entityType: "Auth",
      entityId: user._id,
      details: { email: user.email, role: user.role },
    });

    sendTokenResponse(user, 201, res, "Registration successful.");
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    await logAuditEvent({
      actorId: user._id,
      actorName: user.name,
      action: "USER_LOGIN",
      entityType: "Auth",
      entityId: user._id,
      details: { email: user.email },
    });

    sendTokenResponse(user, 200, res, "Login successful.");
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  res.cookie("fiscora_token", "none", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  if (req.user) {
    await logAuditEvent({
      actorId: req.user._id,
      actorName: req.user.name,
      action: "USER_LOGOUT",
      entityType: "Auth",
      entityId: req.user._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

exports.getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organization: req.user.organization,
      createdAt: req.user.createdAt,
    },
  });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, organization } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (organization) user.organization = organization.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both current and new password.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password does not match.",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    next(err);
  }
};
