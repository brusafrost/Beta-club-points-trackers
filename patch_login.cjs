const fs = require('fs');
let code = fs.readFileSync('src/services/storage.ts', 'utf8');

const oldLogin = `public static async loginStudent(email: string, password?: string): Promise<{ success: boolean; member?: Member; error?: string; token?: string }> {
    const member = localMembers.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!member) return { success: false, error: 'Student not found.' };
    const session: AuthSession = { token: \`tok-\${Date.now()}\`, email: member.email, isOfficer: false, memberId: member.id, name: member.name };
    this.saveSession(session);
    return { success: true, member, token: session.token };
  }`;

const newLogin = `public static async loginStudent(email: string, password?: string): Promise<{ success: boolean; member?: Member; error?: string; token?: string }> {
    // Await docs directly from firestore to prevent race conditions on slow connections
    const snap = await getDocs(collection(db, 'members'));
    const members = snap.docs.map(d => d.data() as Member);
    const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!member) return { success: false, error: 'Student not found.' };
    const session: AuthSession = { token: \`tok-\${Date.now()}\`, email: member.email, isOfficer: false, memberId: member.id, name: member.name };
    this.saveSession(session);
    return { success: true, member, token: session.token };
  }`;

if (code.includes('public static async loginStudent')) {
  // Regex replace to handle exact matches safely
  code = code.replace(/public static async loginStudent[\s\S]*?return \{ success: true, member, token: session\.token \};\n  \}/, newLogin);
  fs.writeFileSync('src/services/storage.ts', code);
  console.log('Login logic patched for reliability.');
}
