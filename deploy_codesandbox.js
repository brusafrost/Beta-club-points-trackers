const fs = require('fs');
const https = require('https');

const htmlContent = fs.readFileSync('dist/index.html', 'utf8');

const data = JSON.stringify({
  files: {
    "package.json": {
      "content": {
        "main": "index.html",
        "scripts": { "start": "serve ." },
        "dependencies": { "serve": "^13.0.0" }
      }
    },
    "index.html": {
      "content": htmlContent
    }
  }
});

const options = {
  hostname: 'codesandbox.io',
  path: '/api/v1/sandboxes/define?json=1',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
