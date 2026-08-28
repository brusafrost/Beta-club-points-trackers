#!/bin/bash
echo "Downloading fixes..."
curl -sL https://ais-pre-zpgrerfhz4p34jvj2vx3wl-658370730741.us-east1.run.app/storage.ts.txt > src/services/storage.ts
curl -sL https://ais-pre-zpgrerfhz4p34jvj2vx3wl-658370730741.us-east1.run.app/App.tsx.txt > src/App.tsx
curl -sL https://ais-pre-zpgrerfhz4p34jvj2vx3wl-658370730741.us-east1.run.app/gasCode.ts.txt > src/services/gasCode.ts
echo "Building and deploying to Firebase..."
npm run build && npx firebase-tools deploy
