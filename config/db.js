import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

export let usersCollection;
export let lessonsCollection;

export const connectDB = async () => {
  await client.connect();
  const db = client.db("digital_life");
  usersCollection = db.collection("users");
  lessonsCollection = db.collection("lessons");
  console.log("MongoDB Connected");
};
