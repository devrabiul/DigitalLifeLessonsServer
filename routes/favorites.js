import express from "express";
import { favoritesCollection, lessonsCollection } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { category, emotionalTone } = req.query;

    const query = { userEmail: email };
    if (category) query.category = category;
    if (emotionalTone) query.emotionalTone = emotionalTone;

    const favorites = await favoritesCollection
      .find(query)
      .sort({ addedAt: -1 })
      .toArray();

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.body;
    const { email } = req.user;

    const existing = await favoritesCollection.findOne({ 
      userEmail: email, 
      lessonId: new ObjectId(lessonId) 
    });

    if (existing) {
      return res.status(400).json({ message: "Lesson already in favorites" });
    }

    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(lessonId) });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const favoriteData = {
      userEmail: email,
      lessonId: lesson._id,
      title: lesson.title,
      authorName: lesson.author?.name || "Unknown",
      category: lesson.category,
      emotionalTone: lesson.emotionalTone,
      photoURL: lesson.photoURL,
      addedAt: new Date(),
    };

    await favoritesCollection.insertOne(favoriteData);
    await lessonsCollection.updateOne(
      { _id: new ObjectId(lessonId) },
      { $inc: { favoritesCount: 1 } }
    );

    res.status(201).json({ message: "Added to favorites" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:lessonId", verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { email } = req.user;

    const result = await favoritesCollection.deleteOne({ 
      userEmail: email, 
      lessonId: new ObjectId(lessonId) 
    });

    if (result.deletedCount > 0) {
      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        { $inc: { favoritesCount: -1 } }
      );
      res.json({ message: "Removed from favorites" });
    } else {
      res.status(404).json({ message: "Favorite not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
