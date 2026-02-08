import admin from "firebase-admin";

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    serviceAccount = require("../firebase-admin.json");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error.message);
}

export default admin;
