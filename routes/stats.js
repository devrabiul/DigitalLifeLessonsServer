import express from "express";
import { usersCollection, lessonsCollection, reportsCollection } from "../config/db.js";

const router = express.Router();

// Admin Dashboard Stats
router.get("/admin", async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const totalPublicLessons = await lessonsCollection.countDocuments({ privacy: "public" });
    const totalReports = await reportsCollection.countDocuments();

    // Today's lessons
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLessons = await lessonsCollection.countDocuments({
      createdAt: { $gte: today }
    });

    // Most active contributors (top 5)
    const activeContributors = await lessonsCollection.aggregate([
      { $group: { _id: "$author.email", name: { $first: "$author.name" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    // Lesson growth (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await lessonsCollection.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });

      last7Days.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        count
      });
    }

    res.json({
      totalUsers,
      totalPublicLessons,
      totalReports,
      todayLessons,
      activeContributors,
      growthData: last7Days
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User Dashboard Stats
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const lessonsCount = await lessonsCollection.countDocuments({ "author.email": email });
    
    // Total saved (favorites) - assuming user object in DB has a favorites array or similar
    // Actually, it might be in lessonsCollection where users mark as favorite.
    // Let's check how favorites are stored. Usually 1 lesson has multiple favorites.
    // Wait, is there a favoritesCollection? Let's check usersCollection structure.
    const user = await usersCollection.findOne({ email });
    const favoritesCount = user?.favorites?.length || 0;

    // Recently added lessons by this user
    const recentLessons = await lessonsCollection.find({ "author.email": email })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Weekly contributions (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await lessonsCollection.countDocuments({
        "author.email": email,
        createdAt: { $gte: date, $lt: nextDate }
      });

      last7Days.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        count
      });
    }

    res.json({
      lessonsCount,
      favoritesCount,
      recentLessons,
      contributionData: last7Days
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
