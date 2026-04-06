import express from "express";
import {
  createReview,
  getEventReviews,
  getUserReviews,
  deleteReview,
  getLatestReviews,
  seedReviews,
} from "../controller/reviewController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/latest", getLatestReviews);
router.post("/", auth, createReview);
router.get("/event/:eventId", getEventReviews);
router.get("/my-reviews", auth, getUserReviews);
router.delete("/:reviewId", auth, deleteReview);
router.post("/seed/sample", seedReviews);

export default router;