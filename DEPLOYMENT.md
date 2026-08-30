Deploying to Surge (betaclub-gcps-live.surge.sh)

Local interactive deploy (no token required):

  1. Ensure your app is built into the "dist" directory (or set BUILD_DIR).
     e.g. npm run build

  2. Run the helper script interactively:
     ./surge.sh

Non-interactive CI deploy (recommended):

  1. Create a Surge token locally:
     - Install surge (npm i -g surge) and run `surge login` to authenticate
     - Run `surge token` to get your token value

  2. Add the token to GitHub repo secrets as SURGE_TOKEN

  3. Configure your CI job to set BUILD_DIR if needed and run:
     SURGE_TOKEN=${{ secrets.SURGE_TOKEN }} ./surge.sh

Notes:
- The script defaults to domain: betaclub-gcps-live.surge.sh and build dir: ./dist
- Do NOT commit secrets. Keep SURGE_TOKEN in CI secrets only.
- For a standalone one-off, you can also run: npx surge ./dist betaclub-gcps-live.surge.sh
