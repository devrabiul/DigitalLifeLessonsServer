import express from "express";
import { usersCollection, lessonsCollection, reportsCollection, favoritesCollection } from "../config/db.js";

const router = express.Router();

router.get("/admin", async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const totalPublicLessons = await lessonsCollection.countDocuments({ privacy: "public" });
    const totalReports = await reportsCollection.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLessons = await lessonsCollection.countDocuments({
      createdAt: { $gte: today }
    });

    const activeContributors = await lessonsCollection.aggregate([
      { $group: { _id: "$author.email", name: { $first: "$author.name" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

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

router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const lessonsCount = await lessonsCollection.countDocuments({ "author.email": email });
    const favoritesCount = await favoritesCollection.countDocuments({ userEmail: email });

    const recentLessons = await lessonsCollection.find({ "author.email": email })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

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
