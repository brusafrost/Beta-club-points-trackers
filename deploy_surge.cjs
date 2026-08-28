const { spawn } = require('child_process');
const surge = spawn('npx', ['surge', './dist', 'betaclub-gcps-live.surge.sh']);
surge.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  if (str.toLowerCase().includes('email:')) {
    surge.stdin.write('brusafrost.temp.surge@gmail.com\n');
  }
  if (str.toLowerCase().includes('password:')) {
    surge.stdin.write('BetaClub123!@#\n');
  }
});
surge.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});
surge.on('close', (code) => {
  console.log(`Surge exited with code ${code}`);
});
