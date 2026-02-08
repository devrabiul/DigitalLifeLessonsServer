import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

export let usersCollection;
export let lessonsCollection;
export let reportsCollection;
export let favoritesCollection;
export let commentsCollection;

export const connectDB = async () => {
  try {
    if (usersCollection) return;
    
    await client.connect();
    const db = client.db();
    usersCollection = db.collection("users");
    lessonsCollection = db.collection("lessons");
    reportsCollection = db.collection("reports");
    favoritesCollection = db.collection("favorites");
    commentsCollection = db.collection("comments");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
};
