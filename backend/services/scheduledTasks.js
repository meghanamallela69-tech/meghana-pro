import cron from "node-cron";
import { cleanupExpiredReservations } from "../controller/eventBookingController.js";

const startScheduledTasks = () => {
  // Cleanup expired ticket reservations every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      await cleanupExpiredReservations();
    } catch (error) {
      console.error("❌ Scheduled cleanup failed:", error.message);
    }
  });
};

export { startScheduledTasks };
