import express from "express";
import admin from "../config/firebaseAdmin.js";
import { usersCollection, lessonsCollection } from "../config/db.js";
import { createToken } from "../utils/jwt.js";

const router = express.Router();

router.post("/sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const idToken = authHeader.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return res.status(400).json({ message: "Invalid Firebase token" });
    }

    const { name, photoURL } = req.body;

    let user = await usersCollection.findOne({ email });

    if (!user) {
      user = {
        name: name || "User",
        email,
        photoURL: photoURL || "",
        role: "user",
        isPremium: false,
        createdAt: new Date(),
      };

      await usersCollection.insertOne(user);
    }

    const token = createToken(user);

    res.json({
      token,
      role: user.role,
      isPremium: user.isPremium,
    });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    res.status(500).json({ message: "User sync failed" });
  }
});


router.get("/top-contributors", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const contributors = await lessonsCollection
      .aggregate([
        { $match: { privacy: "public" } },
        {
          $group: {
            _id: "$author.email",
            name: { $first: "$author.name" },
            photoURL: { $first: "$author.photo" },
            email: { $first: "$author.email" },
            lessonsCount: { $sum: 1 },
            totalLikes: { $sum: "$likesCount" },
          },
        },
        { $sort: { lessonsCount: -1, totalLikes: -1 } },
        { $limit: parseInt(limit) },
      ])
      .toArray();

    res.send(contributors);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

export default router;
