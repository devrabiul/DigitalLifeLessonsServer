import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import usersRoute from "./routes/users.js";
import lessonsRoute from "./routes/lessons.js";
import paymentsRoute from "./routes/payments.js";
import statsRoute from "./routes/stats.js";
import favoritesRoute from "./routes/favorites.js";
import adminRoute from "./routes/admin.js";
import Stripe from "stripe";
import { usersCollection } from "./config/db.js";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

app.use(cors());

app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userEmail = session.metadata.email;

      console.log(`Payment successful for user: ${userEmail}`);

      try {
        const result = await usersCollection.updateOne(
          { email: userEmail },
          { $set: { isPremium: true } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`User ${userEmail} upgraded to Premium successfully.`);
        } else {
          console.warn(`User ${userEmail} found but status not changed (maybe already premium?).`);
        }
      } catch (dbErr) {
        console.error("Database update failed during webhook:", dbErr);
        return res.status(500).json({ message: "Upgrade failed after payment" });
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use("/users", usersRoute);
app.use("/lessons", lessonsRoute);
app.use("/payments", paymentsRoute);
app.use("/stats", statsRoute);
app.use("/favorites", favoritesRoute);
app.use("/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Server running...");
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

export default app;
