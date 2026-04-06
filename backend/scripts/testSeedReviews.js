import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const testSeedReviews = async () => {
  try {
    console.log("🌱 Seeding sample reviews...\n");
    
    const response = await axios.post(`${API_BASE}/reviews/seed/sample`);
    
    if (response.data.success) {
      console.log("✅ Success!");
      console.log(`📊 Created ${response.data.count} sample reviews\n`);
      console.log("🎉 Reviews have been added to the database!");
      console.log("📍 Visit http://localhost:5173/reviews to see them!\n");
    } else {
      console.log("❌ Failed:", response.data.message);
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data?.message || error.message);
  }
};

testSeedReviews();
