const { spawn } = require('child_process');

const surge = spawn('surge', ['./dist', 'beta-club-tracker-live.surge.sh']);

surge.stdout.on('data', (data) => {
  const str = data.toString();
  console.log(str);
  
  if (str.includes('email:')) {
    surge.stdin.write('betaclub123456789@example.com\n');
  }
  if (str.includes('password:')) {
    surge.stdin.write('securepassword123\n');
  }
});

surge.stderr.on('data', (data) => {
  console.error(data.toString());
});

surge.on('close', (code) => {
  console.log(`Surge exited with code ${code}`);
});
