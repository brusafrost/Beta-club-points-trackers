import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as fs from 'fs';

const firebaseConfig = {
  projectId: "compact-plexus-clcf1",
  appId: "1:804278453156:web:13753315e0f2763ff37731",
  apiKey: "AIzaSyBOPBSWQXcQVKjGQHh9QODKlTOBfzQsV78",
  authDomain: "compact-plexus-clcf1.firebaseapp.com",
  storageBucket: "compact-plexus-clcf1.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const html = fs.readFileSync('dist/index.html', 'utf8');

async function run() {
  try {
    const fileRef = ref(storage, 'app/index.html');
    await uploadString(fileRef, html, 'raw', { contentType: 'text/html' });
    const url = await getDownloadURL(fileRef);
    console.log("URL:", url);
  } catch (e) {
    console.error("Storage error:", e.message);
  }
  process.exit(0);
}
run();
