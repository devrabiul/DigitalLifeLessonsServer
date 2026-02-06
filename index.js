import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import usersRoute from "./routes/users.js";
import lessonsRoute from "./routes/lessons.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", usersRoute);
app.use("/lessons", lessonsRoute);

app.get("/", (req, res) => {
  res.send("Server running...");
});

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("Server started");
  });
});
