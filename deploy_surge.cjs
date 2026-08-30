const { spawn } = require('child_process');

const buildDir = process.env.BUILD_DIR || './dist';
const domain = process.env.SURGE_DOMAIN || 'betaclub-gcps-live.surge.sh';
const token = process.env.SURGE_TOKEN;

if (!token) {
  console.error('SURGE_TOKEN env var is required for non-interactive deploys. Set SURGE_TOKEN and try again.');
  process.exit(1);
}

const args = ['surge', buildDir, domain, '--token', token];
const surge = spawn('npx', args, { stdio: 'inherit' });
nsurge.on('close', (code) => {
  console.log(`Surge exited with code ${code}`);
  process.exit(code);
});
