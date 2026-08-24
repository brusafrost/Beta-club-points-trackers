import re

with open("src/components/OfficerDashboard.tsx", "r") as f:
    content = f.read()

# 1. Add Save icon import
content = content.replace("HardDrive\n} from 'lucide-react';", "HardDrive,\n  Save\n} from 'lucide-react';")

# 2. Add state variables
state_vars = """
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemFirstName, setEditMemFirstName] = useState("");
  const [editMemLastName, setEditMemLastName] = useState("");
  const [editMemEmail, setEditMemEmail] = useState("");
  const [editMemGrade, setEditMemGrade] = useState(11);
  const [editMemPoints, setEditMemPoints] = useState("");
"""
content = content.replace("  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');", state_vars.strip('\n'))

# 3. Add handlers
handlers = """
  const handleEditMemberSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const members = BetaStorage.getMembers();
    const mem = members.find(m => m.id === editingMember.id);
    if (mem) {
      mem.firstName = editMemFirstName.trim();
      mem.lastName = editMemLastName.trim();
      mem.name = `${mem.firstName} ${mem.lastName}`.trim();
      mem.email = editMemEmail.toLowerCase().trim();
      mem.gradeLevel = editMemGrade;
      const pts = parseFloat(editMemPoints);
      if (!isNaN(pts)) mem.totalPoints = Math.round(pts * 10) / 10;
      BetaStorage.set('betaclub_members_v3', members);
      showToast({ title: 'Member Updated', message: `Profile updated for ${mem.name}`, type: 'success' });
      setEditingMember(null);
      onRefresh();
    }
  };

  const handleRemoveSubmission = (sub: Submission) => {
    if (sub.status === 'Approved') {
      BetaStorage.archiveApprovedSubmissions([sub.id]);
      showToast({ title: 'Removed', message: 'Item archived and removed from queue. Points kept.', type: 'info' });
    } else {
      BetaStorage.deleteSubmission(sub.id);
      showToast({ title: 'Removed', message: 'Item permanently deleted from queue.', type: 'info' });
    }
    onRefresh();
  };

  const handleApproveAllPending = () => {
"""
content = content.replace("  const handleApproveAllPending = () => {", handlers.strip('\n'))

# 4. Add Remove to Pending
pending_replacement = """                            <button
                              type="button"
                              onClick={() => {
                                setReviewSub(sub);
                                setCustomPts(String(sub.points));
                                setReviewNote(sub.officerNotes || '');
                              }}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-mono transition-colors"
                              title="Adjust points or reject"
                            >
                              Edit / Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubmission(sub)}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-red-600 border border-zinc-200 rounded-xl text-xs font-mono transition-colors"
                              title="Remove without rejecting"
                            >
                              Remove
                            </button>
                          </div>
                        )}"""
content = re.sub(r'                            <button[\s\S]*?Edit \/ Reject[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*\)}', pending_replacement, content)

# 5. Add Remove to Approved
approved_target = """                        {sub.status === 'Approved' && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Approved (+{sub.points.toFixed(1)} pts)</span>
                          </span>
                        )}"""
approved_replacement = """                        {sub.status === 'Approved' && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Approved (+{sub.points.toFixed(1)} pts)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubmission(sub)}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl text-xs font-mono transition-colors"
                              title="Archive from queue"
                            >
                              Remove
                            </button>
                          </div>
                        )}"""
content = content.replace(approved_target, approved_replacement)

# 6. Add Edit Profile button
edit_btn_target = """                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadStudentTranscript(selectedStudent)}"""
edit_btn_replacement = """                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(selectedStudent);
                        const parts = selectedStudent.name.split(' ');
                        setEditMemFirstName(selectedStudent.firstName || parts[0]);
                        setEditMemLastName(selectedStudent.lastName || parts.slice(1).join(' '));
                        setEditMemEmail(selectedStudent.email);
                        setEditMemGrade(selectedStudent.gradeLevel || 11);
                        setEditMemPoints(String(selectedStudent.totalPoints || 0));
                      }}
                      className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadStudentTranscript(selectedStudent)}"""
content = content.replace(edit_btn_target, edit_btn_replacement)

# 7. Add Modal at bottom
modal = """
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-zinc-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5"><User className="w-4 h-4" /> Edit Roster Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditMemberSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">First Name</label>
                  <input type="text" value={editMemFirstName} onChange={e => setEditMemFirstName(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Last Name</label>
                  <input type="text" value={editMemLastName} onChange={e => setEditMemLastName(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-zinc-700">Email Address</label>
                <input type="email" value={editMemEmail} onChange={e => setEditMemEmail(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Grade Level</label>
                  <select value={editMemGrade} onChange={e => setEditMemGrade(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden">
                    <option value={9}>9th Grade</option>
                    <option value={10}>10th Grade</option>
                    <option value={11}>11th Grade</option>
                    <option value={12}>12th Grade</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Total Points Override</label>
                  <input type="number" step="0.1" value={editMemPoints} onChange={e => setEditMemPoints(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden font-bold" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
"""
content = content.replace("    </div>\n  );\n};\n", modal)
# Make sure we didn't add it too many times
if content.count('Edit Roster Member') > 1:
    print("Warning: Multiple instances of modal")

with open("src/components/OfficerDashboard.tsx", "w") as f:
    f.write(content)

