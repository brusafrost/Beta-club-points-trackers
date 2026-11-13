# Beta Club Service Points & Hours Tracker

A web portal for High School National Beta Club chapters. Students can log volunteer service hours and track progress; chapter officers/advisors can review submissions, manage rosters, and export transcripts. Read the security and Firestore usage notes before deploying this client-side application with real student data.

---

## Key Features

- **Student Portal**:
  - Student ID-based Member Registration and Sign In.
  - Real-time progress bar toward the fixed 40-point chapter cap.
  - Volunteer slip submission with activity category selection and proof image upload.
  - Interactive service history transcript with individual CSV export.
  - Officer inquiry messaging thread for questions regarding pending or adjusted submissions.

- **Officer & Advisor Portal**:
  - Officer dashboard passcode prompt (`beta4216` default, customizable in Chapter Settings; see the security note below).
  - One-click **Batch Approve All** or individual slip verification with proof modal inspection.
  - Point override and discretionary bonus point adjustment tools.
  - Complete chapter roster management with multi-field search and status filters (Cap Met, In Progress, Near Cap, Zero Hours).
  - Bulk roster import (CSV, tab-delimited sheets, or name lists).
  - Bulk meeting point awards by student ID, with a reviewable recipient list and Beta-specific master-category totals.
  - Bulk officer point entries from tab-separated or quoted CSV rows, classified as Beta-specific and reflected in student history and progress bars.
  - Audit-ready matrix cross-tabulation and CSV chapter exports.
  - Custom category configuration and hour multipliers; the chapter point cap is fixed at 40.

---

## Student Account Sign-In

Students sign in with their 9- or 10-digit student ID. Student IDs are identifiers, not verified credentials: password authentication and password resets are not implemented. Do not treat this sign-in flow as account security.

Registration checks the roster and transactionally creates a profile whose Firestore document ID is the student ID. Concurrent registrations for that ID cannot overwrite the winning profile. Sign-in queries for that ID and reports an error if multiple profiles already match.

### Resolving Existing Duplicate Profiles

When sign-in reports multiple profiles, an officer should review every active roster entry with that student ID and compare its submission history before taking action. Keep the profile with the verified hours/points. Remove only confirmed-empty duplicates through the roster; removal archives the profile and deletes all submissions linked to it. The archived profile can be restored from **Officer Portal → Deleted Members**, but deleted submissions are not restored by that action. Verify the retained student's history after cleanup, then have the student sign in again.

### Firestore Usage and Security

- Student/officer sign-in does not write to Firestore. A successful new student registration writes one member document; a duplicate registration is rejected without creating or replacing a profile.
- The account lookup uses a targeted query, but it does **not** eliminate the app's broader reads: `BetaStorage.initialize()` starts collection-wide listeners for members, submissions, events, officers, audit logs, deleted members, meeting awards, and transcript entries when the app loads—even before a student signs in. Listener snapshots and document changes count as reads. Therefore, a read reduction from the targeted lookup alone may be small.
- Check Firebase Console usage and the project's plan to identify whether reads or writes are actually being exhausted; do not assume a reported “60k” limit is specifically a write limit. Firestore reads, writes, and deletes have separate usage metrics; listener reads appear as reads.
- The checked-in [`firestore.rules`](./firestore.rules) currently permits unauthenticated reads and writes. The officer passcode is checked in client code and is not Firebase authorization. A public deployment with these rules is not secured: client-side validation and transactions cannot stop arbitrary clients from reading or writing the database. Before storing real student data, implement Firebase Authentication and restrictive Firestore rules (or route privileged writes through a trusted backend), then test the rules against every app workflow.
- Password changes/resets are unavailable because Firebase Authentication is not integrated. The app must not claim that a student password was set or changed.

---

## Bulk Meeting Point Awards

1. Sign in as an officer and open **Tools**.
2. Enter a unique label for the meeting. Include the date if meeting names may repeat.
3. Paste the student ID column from the Google Form responses. IDs can be separated by lines, tabs, commas, semicolons, or spaces; a `Student ID` or `Student Number` header is ignored.
4. Review matched students and the counts for IDs not found, ambiguous matches, invalid values, and duplicates. Matched students are selected by default; uncheck anyone who should not receive a point.
5. Choose **Award 1 Point to Selected** and confirm the recipient count.

The award updates only selected students' point totals and manual point adjustments. Each selected student gets an individual credit record in their student history showing the meeting label, one-point amount, date, and that the chapter officer awarded it directly to them. Meeting credits count toward the Beta-specific point bar, but do not create a student event or add volunteer hours. The officer audit log records the meeting label and award count, not student names. You can rerun the same meeting label to award missed students; students who already have an individual receipt are skipped, so they cannot receive the same meeting point twice. Older awards made before individual receipts were available are blocked from retry until an officer reviews the old records.

For **Bulk Point Entries With Student History**, paste one row per student in `student ID, points, event, optional note` format. Tab-separated rows copied from a spreadsheet and quoted CSV event names are supported. Event names are subcategories, not new shared event-catalog entries; manual point entries are classified under the Beta-specific master category. Invalid or failed rows remain in the text box for correction; successfully saved rows are removed.

Students and officer transcript views show Beta-specific and Non-Beta point bars, plus separate approved-hour requirement bars. The 5-hour Beta-specific and 35-hour Non-Beta requirements must each be met independently; earning 40 or more Non-Beta hours does not replace the Beta-specific requirement. Manual point awards count as points only; they do not count as volunteer hours toward the 5-hour Beta-specific requirement.

To verify Firestore behavior without touching production data, run `npm run test:bulk-award` and `npm run test:student-account`. Both use the local Firestore Emulator; the account test exercises simultaneous registrations and legacy duplicate detection. These require Java.

---

## Beta and Non-Beta Service Hours

The chapter defaults are **5 approved Beta-specific hours** and **35 approved Non-Beta hours**, tracked separately from the annual points cap. Students submit an activity and hours but do not choose which requirement receives the credit. Officers assign the type when reviewing the submission; the official category type is preselected when available, and unlisted categories require an officer choice.

Student-created activity names remain submission records, not shared events. Their names stay in that student's personal history and are hidden from student-facing roster matrices. Officers can review them in **Officer Portal → Tools** and promote a category to an official Beta or Non-Beta choice for future submissions. Officers can edit or delete official categories; approved history keeps its existing type and points when a category changes or is removed. Batch approval handles categories with a known official type and leaves unclassified service submissions pending for officer review.

---

## Local Development & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) or [bun](https://bun.sh/)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/beta-points-tracker.git
cd beta-points-tracker
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
The compiled, production-ready static files will be generated in the `dist/` directory.

---

## Deployment Options

These are hosting options only; they do not secure Firestore. Review the [Firestore usage and security notes](#firestore-usage-and-security) and configure Authentication and restrictive rules before using real student data.

### Option A: GitHub Pages (Recommended for Schools)
1. Push this repository to your GitHub account.
2. In GitHub, go to **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. The included [`deploy.yml`](./.github/workflows/deploy.yml) workflow runs `npm run build`, copies the custom-domain [`CNAME`](./CNAME) into `dist/`, and deploys that artifact on pushes to `main` or `master` (or via manual workflow dispatch).
4. The workflow builds the Vite app from `index.html` and `src/main.tsx`; standalone HTML copies in the repository are not the deployed application.
5. Confirm the deployment in the repository's **Actions** tab. DNS and the custom-domain setting must also be configured in GitHub Pages.

### Option B: Vercel (1-Click Deployment)
1. Go to [Vercel](https://vercel.com) and log in with your GitHub account.
2. Click **Add New... &rarr; Project**.
3. Select your `beta-points-tracker` repository and click **Deploy**.
4. Your tracker will be live instantly on a free `.vercel.app` domain.

### Option C: Netlify (Drag & Drop)
1. Run `npm run build` on your computer.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist/` folder to deploy immediately.

---

## Technology Stack
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Database**: Firebase Cloud Firestore
- **Browser storage**: LocalStorage for the client session; IndexedDB for offline photo slip caching
- **Authentication**: Student ID lookup and client-side officer passcode only; Firebase Authentication is not configured
