import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "compact-plexus-clcf1",
  appId: "1:804278453156:web:13753315e0f2763ff37731",
  apiKey: "AIzaSyBOPBSWQXcQVKjGQHh9QODKlTOBfzQsV78",
  authDomain: "compact-plexus-clcf1.firebaseapp.com",
  storageBucket: "compact-plexus-clcf1.firebasestorage.app",
  messagingSenderId: "804278453156",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-betaclubpointstr-5acfd9f5-9724-4468-8b13-1f8bc6d3f860");
