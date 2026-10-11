const dotenv = require("dotenv");

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
}

if (!process.env.PORT) {
  console.error("PORT is not defined in .env file");
}

const config = {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
};

module.exports = config;