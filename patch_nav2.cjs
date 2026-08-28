const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const buttonRegex = /<button[\s\S]*?onClick=\{\}[\s\S]*?<\/button>/m;
code = code.replace(buttonRegex, '');

fs.writeFileSync('src/components/Navbar.tsx', code);
