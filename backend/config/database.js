const mongoose = require("mongoose");
const config = require("./config");
const dns = require("node:dns");

// Set reliable Google DNS servers for Windows SRV record resolution
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if already set or restricted
}

async function connectDB() {
  try {
    const uri = (config.MONGO_URI || "").trim();
    const conn = await mongoose.connect(uri);
    console.log(`===============================================`);
    console.log(` MongoDB Connected Successfully!`);
    console.log(` Host:     ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
    console.log(`===============================================`);
  } catch (err) {
    console.error(" Error Connecting Database:", err.message);
  }
}

module.exports = connectDB;