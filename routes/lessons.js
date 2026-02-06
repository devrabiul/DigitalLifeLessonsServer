import express from "express";
import { lessonsCollection } from "../config/db.js";

const router = express.Router();

router.get("/featured", async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const limitNum = parseInt(limit);

    let lessons = await lessonsCollection
      .find({ isFeatured: true, privacy: "public" })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .toArray();

    if (lessons.length < limitNum) {
      const moreNeeded = limitNum - lessons.length;
      const featuredIds = lessons.map((l) => l._id);

      const moreLessons = await lessonsCollection
        .find({
          _id: { $nin: featuredIds },
          privacy: "public",
        })
        .sort({ likesCount: -1 })
        .limit(moreNeeded)
        .toArray();

      lessons = [...lessons, ...moreLessons];
    }

    res.send(lessons);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

export default router;
