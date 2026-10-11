const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/database");
const config = require("./config/config");

const app = express();

connectDB();


app.use(express.json());

app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
})
