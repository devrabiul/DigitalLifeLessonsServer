import express from "express";
import { lessonsCollection, usersCollection } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { ObjectId } from "mongodb";

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
      authorEmail,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { privacy: "public" };

    if (authorEmail) {
      query["author.email"] = authorEmail;
    }

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

router.get("/my-lessons", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const lessons = await lessonsCollection
      .find({ "author.email": email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      story,
      category,
      emotionalTone,
      image,
      privacy,
      access_level,
    } = req.body;

    if (!title || !story || !category || !emotionalTone || !privacy || !access_level) {
      return res.status(400).json({ message: "All fields are required except image" });
    }

    const user = await usersCollection.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (access_level === "premium" && !user.isPremium && user.role !== "admin") {
      return res.status(403).json({ message: "Only premium users can create premium lessons" });
    }

    const newLesson = {
      title,
      story,
      shortDescription: story.slice(0, 150) + (story.length > 150 ? "..." : ""),
      category,
      emotionalTone,
      photoURL: image || "",
      privacy,
      access_level,
      author: {
        name: user.name,
        email: user.email,
        photo: user.photoURL,
        id: user._id,
      },
      createdAt: new Date(),
      likesCount: 0,
      favoritesCount: 0,
      isFeatured: false,
    };

    const result = await lessonsCollection.insertOne(newLesson);
    res.status(201).json({
      message: "Lesson created successfully",
      lessonId: result.insertedId,
      lesson: newLesson,
    });
  } catch (error) {
    console.error("Add Lesson Error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, story, category, emotionalTone, photoURL, privacy, access_level } = req.body;

    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    if (lesson.author.email !== req.user.email) {
      return res.status(403).json({ message: "Unauthorized to update this lesson" });
    }

    const user = await usersCollection.findOne({ email: req.user.email });
    if (access_level === "premium" && !user.isPremium && user.role !== "admin") {
      return res.status(403).json({ message: "Upgrade to premium to set premium access level" });
    }

    const updatedLesson = {
      $set: {
        ...(title && { title }),
        ...(story && { 
          story,
          shortDescription: story.slice(0, 150) + (story.length > 150 ? "..." : "")
        }),
        ...(category && { category }),
        ...(emotionalTone && { emotionalTone }),
        ...(photoURL !== undefined && { photoURL }),
        ...(privacy && { privacy }),
        ...(access_level && { access_level }),
        updatedAt: new Date(),
      }
    };

    await lessonsCollection.updateOne({ _id: new ObjectId(id) }, updatedLesson);
    res.json({ message: "Lesson updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    if (lesson.author.email !== req.user.email && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to delete this lesson" });
    }

    await lessonsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Atomically increment viewsCount and return the updated document
    const result = await lessonsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { viewsCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ message: "Lesson not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user;

    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const liked = lesson.likes?.includes(email);
    const update = liked
      ? { $pull: { likes: email }, $inc: { likesCount: -1 } }
      : { $addToSet: { likes: email }, $inc: { likesCount: 1 } };

    await lessonsCollection.updateOne({ _id: new ObjectId(id) }, update);
    res.json({ liked: !liked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/report", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { email } = req.user;

    const report = {
      lessonId: new ObjectId(id),
      reporterEmail: email,
      reason,
      timestamp: new Date(),
    };

    const { reportsCollection } = await import("../config/db.js");
    await reportsCollection.insertOne(report);
    res.status(201).json({ message: "Lesson reported successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const { email, name, photoURL } = req.user;

    const newComment = {
      lessonId: new ObjectId(id),
      userEmail: email,
      userName: name,
      userPhoto: photoURL,
      comment,
      createdAt: new Date(),
    };

    const { commentsCollection } = await import("../config/db.js");
    await commentsCollection.insertOne(newComment);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { commentsCollection } = await import("../config/db.js");
    const comments = await commentsCollection
      .find({ lessonId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const similar = await lessonsCollection
      .find({
        _id: { $ne: new ObjectId(id) },
        privacy: "public",
        $or: [
          { category: lesson.category },
          { emotionalTone: lesson.emotionalTone }
        ]
      })
      .limit(6)
      .toArray();

    res.json(similar);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
