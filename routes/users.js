import express from "express";
import admin from "../config/firebaseAdmin.js";
import { usersCollection } from "../config/db.js";
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

export default router;
