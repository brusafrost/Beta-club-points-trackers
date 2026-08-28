const fs = require('fs');
let code = fs.readFileSync('src/components/StudentSettingsModal.tsx', 'utf8');
code = code.replace("if (res.success && res.member) {", "if (res.success) {");
code = code.replace("onProfileUpdated(res.member);", "onProfileUpdated();");
fs.writeFileSync('src/components/StudentSettingsModal.tsx', code);
