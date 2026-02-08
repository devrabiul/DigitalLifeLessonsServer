# Digital Life Lessons - Server

The backend foundation for the Digital Life Lessons platform. This server provides a robust API for managing users, lessons, payments, and administrative tasks, integrated with MongoDB, Firebase, and Stripe.

## 🚀 Tech Stack

- **Framework:** [Express.js](https://expressjs.com/) (v5)
- **Database:** [MongoDB](https://www.mongodb.com/)
- **Authentication:** [Firebase Admin SDK](https://firebase.google.com/docs/admin) & [JWT](https://jwt.io/)
- **Payments:** [Stripe API](https://stripe.com/)
- **Environment:** Node.js with ES Modules

## ✨ Key Features

- **User Management:** Secure user profiles and authentication logic.
- **Lesson API:** Full CRUD operations for digital lessons.
- **Premium Subscriptions:** Stripe integration with automated webhook handling for seat upgrades.
- **Analytics & Stats:** Dedicated endpoints for platform usage and growth statistics.
- **Admin Dashboard Support:** Specialized routes for administrative control and moderation.
- **Favorites System:** Personalized lesson tracking for users.

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- MongoDB Connection URI
- Firebase Project & Service Account Key
- Stripe Account & Webhook Secret

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd DigitalLifeLessonsServer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   FIREBASE_PROJECT_ID=your_project_id
   JWT_SECRET=your_jwt_secret
   ```

4. **Firebase Configuration:**
   Place your `firebase-admin.json` service account file in the root directory.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## 📜 Available Scripts

- `npm run dev` - Starts the server using `nodemon` for development.
- `npm start` - Starts the server in production mode.

## 🚢 Deployment

This server is configured for deployment on **Vercel** (see `vercel.json`). Ensure all environment variables are correctly configured in your Vercel project settings.