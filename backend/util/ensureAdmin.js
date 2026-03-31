import bcrypt from "bcryptjs";
import { User } from "../models/userSchema.js";

export const ensureAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@eventhub.local";
    const password = process.env.ADMIN_PASSWORD || "Admin@123";
    const name = process.env.ADMIN_NAME || "Admin";

    const existing = await User.findOne({ email }).select("+password");

    if (existing) {
      const force = String(process.env.ADMIN_FORCE_RESET || "").toLowerCase() === "true";
      if (force) {
        const hash = await bcrypt.hash(password, 10);
        await User.updateOne({ _id: existing._id }, { $set: { name, password: hash, role: "admin" } });
      }
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hash, role: "admin" });
    console.log(`✅ Admin user created: ${email}`);
  } catch (error) {
    console.error("❌ ensureAdmin error:", error.message);
    throw error;
  }
};
