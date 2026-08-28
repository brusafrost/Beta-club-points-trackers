const fs = require('fs');
const archiver = require('archiver');
const output = fs.createWriteStream('BetaClubApp.zip');
const archive = archiver('zip', { zlib: { level: 9 } });
output.on('close', () => console.log('Zip created!'));
archive.pipe(output);
archive.file('dist/index.html', { name: 'index.html' });
archive.finalize();
