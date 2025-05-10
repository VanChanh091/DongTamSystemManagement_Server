import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export default db;
