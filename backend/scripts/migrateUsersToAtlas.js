const dns = require("node:dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) { }

const mongoose = require("mongoose");

const LOCAL_URI = "mongodb://127.0.0.1:27017/fiscora";
const ATLAS_URI =
  "mongodb+srv://anikawpatil_db_user:1234@cluster0.xlauogq.mongodb.net/budgetcheck";

async function migrate() {
  console.log("Connecting to local MongoDB...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log("Connected to local MongoDB (fiscora).");

  console.log("Connecting to MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log("Connected to MongoDB Atlas (budgetcheck).");

  const localUserSchema = new mongoose.Schema({}, { strict: false });
  const LocalUser = localConn.model("User", localUserSchema, "users");
  const AtlasUser = atlasConn.model("User", localUserSchema, "users");

  const localUsers = await LocalUser.find({});
  console.log(`Found ${localUsers.length} users in local database.`);

  let inserted = 0;
  let skipped = 0;

  for (const user of localUsers) {
    const obj = user.toObject();
    const exists = await AtlasUser.findOne({ email: obj.email });
    if (!exists) {
      await AtlasUser.create(obj);
      console.log(`Migrated user to Atlas: ${obj.name} (${obj.email})`);
      inserted++;
    } else {
      console.log(`User already exists in Atlas: ${obj.email}`);
      skipped++;
    }
  }

  console.log(`Migration complete. Inserted: ${inserted}, Skipped: ${skipped}`);

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
