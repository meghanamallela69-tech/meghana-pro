import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const resolveSrv = (hostname) =>
  new Promise((resolve, reject) => {
    dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });

export const dbConnection = async () => {
  const maxRetries = parseInt(process.env.DB_RETRY_ATTEMPTS) || 3;
  const retryDelay = parseInt(process.env.DB_RETRY_DELAY) || 5000;

  const ATLAS_USER = "meghana123";
  const ATLAS_PASS = "meghana1234";
  const ATLAS_CLUSTER = "cluster0.gfbrfcg.mongodb.net";
  const DB_NAME = "eventhub";

  const commonOptions = {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: true,
    maxPoolSize: 10,
    retryWrites: true,
    w: "majority",
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Method 1: SRV URI
    try {
      const srvUri = `mongodb+srv://${ATLAS_USER}:${ATLAS_PASS}@${ATLAS_CLUSTER}/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
      const connection = await mongoose.connect(srvUri, commonOptions);
      return onConnected(connection);
    } catch {}

    // Method 2: Manual SRV resolve
    try {
      const srvRecords = await resolveSrv(ATLAS_CLUSTER);
      const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(",");
      const directUri = `mongodb://${ATLAS_USER}:${ATLAS_PASS}@${hosts}/${DB_NAME}?ssl=true&authSource=admin&replicaSet=atlas-${ATLAS_CLUSTER.split(".")[0]}-shard-0&retryWrites=true&w=majority`;
      const connection = await mongoose.connect(directUri, commonOptions);
      return onConnected(connection);
    } catch {}

    // Method 3: Direct shard hostnames
    try {
      const shardHosts = [
        "ac-qghgqgg-shard-00-00.gfbrfcg.mongodb.net:27017",
        "ac-qghgqgg-shard-00-01.gfbrfcg.mongodb.net:27017",
        "ac-qghgqgg-shard-00-02.gfbrfcg.mongodb.net:27017"
      ].join(",");
      const replicaUri = `mongodb://${ATLAS_USER}:${ATLAS_PASS}@${shardHosts}/${DB_NAME}?ssl=true&authSource=admin&replicaSet=atlas-qghgqgg-shard-0&retryWrites=true&w=majority`;
      const connection = await mongoose.connect(replicaUri, commonOptions);
      return onConnected(connection);
    } catch {}

    if (attempt < maxRetries) await sleep(retryDelay);
  }

  console.error("❌ All MongoDB connection attempts failed. Check Atlas IP whitelist and credentials.");
  process.exit(1);
};

function onConnected(connection) {
  const db = connection.connection.db.databaseName;
  const host = connection.connection.host;
  console.log(`✅ MongoDB connected — ${db} @ ${host}`);

  mongoose.connection.on("error", (err) => console.error("❌ DB error:", err.message));
  mongoose.connection.on("disconnected", () => console.warn("⚠️  DB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("🔄 DB reconnected"));

  // Auto-migrate: fix legacy rating fields stored as numbers
  import("../models/eventSchema.js").then(({ Event }) => {
    Event.updateMany(
      { $or: [{ rating: { $type: "number" } }, { rating: null }, { rating: { $exists: false } }] },
      { $set: { rating: { average: 0, totalRatings: 0 } } }
    ).then(result => {
      if (result.modifiedCount > 0) {
        console.log(`🔧 Migrated ${result.modifiedCount} event(s): rating field fixed`);
      }
    }).catch(err => console.error("⚠️  Rating migration error:", err.message));
  });

  return connection;
}
