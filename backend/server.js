const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = require("./app");
const connectDB = require("./config/database");
const config = require("./config/config");

const PORT = config.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(` Fiscora Audit Intelligence Backend Server`);
    console.log(` Status: Running on http://localhost:${PORT}`);
    console.log(` Environment: ${config.NODE_ENV}`);
    console.log(` Target DB: ${config.MONGO_URI.split("@")[1] || config.MONGO_URI}`);
    console.log(`===============================================`);
  });
}

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
});
