import { db } from "../../lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    const snapshot = await db.collection("test").get();
    const data = snapshot.docs.map(doc => doc.data());

    res.status(200).json({
      ok: true,
      message: "Firestore connection successful",
      data,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
