const fs = require('fs');
let code = fs.readFileSync('src/components/OfficerDashboard.tsx', 'utf8');
code = code.replace("BetaStorage.set('betaclub_members_v3', members);", "BetaStorage.updateProfile(mem.id, mem.firstName, mem.lastName, mem.email, mem.gradeLevel);\nif (mem.totalPoints !== undefined) BetaStorage.updateMemberInline(mem.id, 'totalPoints', mem.totalPoints);");
fs.writeFileSync('src/components/OfficerDashboard.tsx', code);
