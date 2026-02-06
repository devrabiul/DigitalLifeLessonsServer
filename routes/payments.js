import express from "express";
import { usersCollection } from "../config/db.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.get("/verify-payment", async (req, res) => {
  try {
    const { userId, session_id } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    let user = await usersCollection.findOne({ email: userId });
    
    if (user && user.isPremium) {
      return res.json({ success: true, message: "Upgraded to Premium!" });
    }

    if (session_id && session_id.startsWith('cs_test')) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status === 'paid') {
        await usersCollection.updateOne(
          { email: userId },
          { $set: { isPremium: true } }
        );
        return res.json({ success: true, message: "Upgraded to Premium via direct check!" });
      }
    }

    res.json({ success: false, message: "Still processing..." });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ message: "Missing userId or email" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Life Lessons Premium - Lifetime Access",
              description: "Unlock all premium features, unlimited lessons, and priority support.",
              images: ["https://i.ibb.co/L9P8PZy/premium-badge.png"],
            },
            unit_amount: 1500 * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata: {
        userId: userId,
        email: email,
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
