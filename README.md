# Beta Club Service Points & Hours Tracker

A modern, full-featured web portal for High School National Beta Club chapters. Allows students to log volunteer service hours, attach proof slips with offline/IndexedDB caching, track real-time progress toward chapter point caps, and enables chapter officers/advisors to review, batch-approve, manage rosters, and export audit-ready CSV transcripts.

---

## Key Features

- **Student Portal**:
  - Secure Member Registration and Sign In.
  - Real-time progress bar toward the chapter point cap (e.g. 40 pts default).
  - Volunteer slip submission with activity category selection and proof image upload.
  - Interactive service history transcript with individual CSV export.
  - Officer inquiry messaging thread for questions regarding pending or adjusted submissions.

- **Officer & Advisor Portal**:
  - Master passcode protection (`beta4216` default, customizable in Chapter Settings).
  - One-click **Batch Approve All** or individual slip verification with proof modal inspection.
  - Point override and discretionary bonus point adjustment tools.
  - Complete chapter roster management with multi-field search and status filters (Cap Met, In Progress, Near Cap, Zero Hours).
  - Bulk roster import (CSV, tab-delimited sheets, or name lists).
  - Audit-ready matrix cross-tabulation and CSV chapter exports.
  - Custom category configuration, hour multipliers, and chapter point cap customization.

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
