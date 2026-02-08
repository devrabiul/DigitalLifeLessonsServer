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

    if (!usersCollection) {
      console.error("DATABASE NOT INITIALIZED");
      return res.status(500).json({ message: "Database not ready" });
    }

    let user = await usersCollection.findOne({ email });

    if (!user) {
      user = {
        name: name || decoded.name || "User",
        email,
        photoURL: photoURL || decoded.picture || "",
        role: "user",
        isPremium: false,
        createdAt: new Date(),
      };

      await usersCollection.insertOne(user);
    } else {
      const updateData = {};
      if (name && name !== user.name) updateData.name = name;
      if (photoURL && photoURL !== user.photoURL) updateData.photoURL = photoURL;

      if (Object.keys(updateData).length > 0) {
        await usersCollection.updateOne({ email }, { $set: updateData });
        user = { ...user, ...updateData };
      }
    }

    const token = createToken(user);

    res.json({
      token,
      user,
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

router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await usersCollection.findOne(
      { email },
      { projection: { _id: 0, name: 1, email: 1, photoURL: 1, isPremium: 1, role: 1, createdAt: 1 } }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.put("/update", async (req, res) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (photoURL) updateData.photoURL = photoURL;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    const result = await usersCollection.updateOne(
      { email },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await usersCollection.findOne({ email });
    res.json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
