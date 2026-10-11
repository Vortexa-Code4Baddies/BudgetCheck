const mongoose = require("mongoose")
const config = require("./config")

async function connectDB(){
    try{
        await mongoose.connect(config.MONGO_URI);
        console.log("Database Connected!!!!!!!!!!!!!!!");
    }catch(err){
        console.log("Error Connecting Database. ", err);
    }
}

module.exports = connectDB;