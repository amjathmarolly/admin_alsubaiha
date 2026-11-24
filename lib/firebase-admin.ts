import * as admin from "firebase-admin";

// Initialised on first use, so `next build` (and CI) work without Firebase secrets.
function app(): admin.app.App {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.app();
}

function lazy<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      const target = get() as any;
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const adminAuth = lazy(() => app().auth());
export const adminDb = lazy(() => app().firestore());
