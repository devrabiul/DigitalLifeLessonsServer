import express from "express";
import { usersCollection, lessonsCollection, reportsCollection } from "../config/db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/users", async (req, res) => {
  try {
    const users = await usersCollection.aggregate([
      {
        $lookup: {
          from: "lessons",
          localField: "email",
          foreignField: "author.email",
          as: "userLessons"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          photoURL: 1,
          isPremium: 1,
          createdAt: 1,
          lessonsCount: { $size: "$userLessons" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { role } });
    res.json({ message: "Role updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await usersCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/lessons", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/lessons/:id/featured", async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;
    await lessonsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isFeatured } });
    res.json({ message: "Featured status updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/lessons/:id/reviewed", async (req, res) => {
  try {
    const { id } = req.params;
    await lessonsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { reviewed: true } });
    res.json({ message: "Lesson marked as reviewed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const reports = await reportsCollection.aggregate([
      {
        $group: {
          _id: "$lessonId",
          reportCount: { $sum: 1 },
          reasons: { $push: { reason: "$reason", reporter: "$reporterEmail", timestamp: "$timestamp" } }
        }
      },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "_id",
          as: "lesson"
        }
      },
      { $unwind: "$lesson" },
      { $sort: { reportCount: -1 } }
    ]).toArray();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/reports/:lessonId/ignore", async (req, res) => {
  try {
    const { lessonId } = req.params;
    await reportsCollection.deleteMany({ lessonId: new ObjectId(lessonId) });
    res.json({ message: "Reports cleared (ignored)" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
