import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import usersRoute from "./routes/users.js";
import lessonsRoute from "./routes/lessons.js";
import paymentsRoute from "./routes/payments.js";
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

app.use("/users", usersRoute);
app.use("/lessons", lessonsRoute);
app.use("/payments", paymentsRoute);

app.get("/", (req, res) => {
  res.send("Server running...");
});

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("Server started");
  });
});
