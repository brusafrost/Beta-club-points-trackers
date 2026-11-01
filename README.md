# Beta Club Service Points & Hours Tracker

A modern, full-featured web portal for High School National Beta Club chapters. Allows students to log volunteer service hours, attach proof slips with offline/IndexedDB caching, track real-time progress toward chapter point caps, and enables chapter officers/advisors to review, batch-approve, manage rosters, and export audit-ready CSV transcripts.

---

## Key Features

- **Student Portal**:
  - Secure Member Registration and Sign In.
  - Real-time progress bar toward the fixed 40-point chapter cap.
  - Volunteer slip submission with activity category selection and proof image upload.
  - Interactive service history transcript with individual CSV export.
  - Officer inquiry messaging thread for questions regarding pending or adjusted submissions.

- **Officer & Advisor Portal**:
  - Master passcode protection (`beta4216` default, customizable in Chapter Settings).
  - One-click **Batch Approve All** or individual slip verification with proof modal inspection.
  - Point override and discretionary bonus point adjustment tools.
  - Complete chapter roster management with multi-field search and status filters (Cap Met, In Progress, Near Cap, Zero Hours).
  - Bulk roster import (CSV, tab-delimited sheets, or name lists).
  - Bulk meeting point awards by student ID, with a reviewable recipient list and Beta-specific master-category totals.
  - Bulk officer point entries from tab-separated or quoted CSV rows, classified as Beta-specific and reflected in student history and progress bars.
  - Audit-ready matrix cross-tabulation and CSV chapter exports.
  - Custom category configuration and hour multipliers; the chapter point cap is fixed at 40.

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

To verify the Firestore award transaction without touching production data, run `npm run test:bulk-award`. This requires Java and runs against a local Firebase Emulator using disposable test members.

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

## Free & School-Safe Deployment Guide

### Option A: GitHub Pages (Recommended for Schools)
1. Push this repository to your GitHub account.
2. In GitHub, go to your repository **Settings** &rarr; **Pages**.
3. Under **Build and deployment**, select **Source: Deploy from a branch** or use a **GitHub Actions** static workflow.
4. Your tracker will be live at `https://YOUR_USERNAME.github.io/beta-points-tracker/`.

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
- **Storage**: Browser LocalStorage & IndexedDB (offline photo slip caching)
