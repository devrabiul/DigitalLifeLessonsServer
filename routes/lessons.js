import express from "express";
import { lessonsCollection } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = "newest",
      category,
      emotionalTone,
      search,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { privacy: "public" };

    if (category) {
      query.category = category;
    }

    if (emotionalTone) {
      query.emotionalTone = emotionalTone;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { story: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === "mostLiked") sortOption = { likesCount: -1 };
    if (sort === "mostSaved") sortOption = { favoritesCount: -1 };
    if (sort === "alphabetical") sortOption = { title: 1 };

    const lessons = await lessonsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const totalLessons = await lessonsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalLessons / limitNum);

    res.send({
      lessons,
      totalLessons,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("Fetch Lessons Error:", error);
    res.status(500).send({ message: error.message });
  }
});

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

router.get("/most-saved", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const lessons = await lessonsCollection
      .find({ privacy: "public" })
      .sort({ favoritesCount: -1 })
      .limit(parseInt(limit))
      .project({
        title: 1,
        author: 1,
        authorName: 1,
        favoritesCount: 1,
        category: 1,
      })
      .toArray();

    res.send(lessons);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

export default router;
