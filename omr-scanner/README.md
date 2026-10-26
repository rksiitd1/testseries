# Shri Classes OMR Scanner

The scanner lives at `/omr-scanner/` and leaves the existing test archive untouched. It reads the current repository `papers.json`, pairs Class 10 and Class 12 papers and answer keys by date, subject, chapter, and numbered paper version, and fetches a selected HTML answer key only when a teacher opens that test. The answer key parser reads the `const KEY = [...]` structure used by the real answer-key files.

## Live app

Open [https://shri-testseries.vercel.app/omr-scanner/](https://shri-testseries.vercel.app/omr-scanner/). The public `roster.json` contains the 16 Class 10 and 18 Class 12 names supplied for this app, so every browser loads the roster automatically. `roster.local.csv` remains a private local copy for teacher-managed imports. Answer keys load from the live test archive. This deployment currently saves scan results only in that browser because Firebase credentials/project configuration are not available yet.

## Run locally

Serve the repository over HTTP so the browser can use ES modules and camera access. From the repository root, run `py -3 -m http.server 8000 --bind 127.0.0.1`, then open `http://localhost:8000/omr-scanner/`. Camera access requires HTTPS on deployed sites; localhost is allowed by modern browsers. The app itself has no build step or third-party npm dependencies.

Run the logic tests from the repository root:

```powershell
npm test --prefix omr-scanner
```

## Student rosters

The two screenshots supplied with this task provided 16 Class 10 names and 18 Class 12 names. They are stored in `roster.local.json` and `roster.local.csv`, both ignored by Git. When the app runs on `localhost` or `127.0.0.1`, it loads the private JSON roster into browser local storage for any class that does not already have roster entries. The names are not bundled into the public app files.

For a deployed app, import `roster.local.csv` through Settings or sign in and add the roster to Firestore. The CSV columns are `studentId,name,class,active`; keep the supplied IDs stable. A single `name` column or one name per row is also accepted, with Class 10 as the default. Roster and results stay in the current browser until Firebase is configured and the teacher signs in.

## Firebase cloud records

1. Create a Firebase project and a Web app. Enable **Authentication → Email/Password** and create the teacher account.
2. Edit `firebase-config.js` and add the web app's `apiKey`, `authDomain`, `projectId`, and `appId` in place of `null`. `firebase-config.example.js` shows the format. Firebase web configuration is a public client identifier; do not add a service account or private key.
3. Create the Firestore database. In `firestore.rules`, replace `teacher@example.com` with the exact email address used for the teacher account, then publish those rules.
4. Deploy the app over HTTPS. Open Settings and sign in. Import `roster.local.csv` on the deployed site if its roster is not already in Firestore. Existing local entries merge with cloud student records. Results are stored with a stable student/test document ID; rescanning an existing result requires a browser confirmation and replaces that result.

The included rules allow access only to the configured teacher email. Do not deploy until that placeholder has been replaced. The app reports whether each result was saved to Firestore or only to this browser. Cloud persistence is not active until Firebase is configured and the teacher signs in successfully.

## Scanning and review

Camera access is requested only after a student is chosen. The scanner loads OpenCV.js once from the pinned OpenCV 4.10.0 documentation CDN, detects a large paper contour, corrects perspective where a four-corner page is found, and looks for repeated round answer marks. Processing stays in browser memory; the photo is not placed in Firestore or Storage. Image upload and manual answer entry work as fallbacks.

Detected marks appear on a review screen. Tesseract.js OCR attempts to read printed question numbers and align bubble rows to the answer key; if it cannot match every row, the app warns the teacher to check the order. Multi-marks, faint marks, and layouts whose detected row count differs from the key are marked uncertain. The teacher can correct any response and set correct/incorrect marking before saving. A key that is absent, malformed, over 100 questions, or conflicting is not used. OCR and bubble detection still need accuracy checks against anonymized classroom sheets before relying on automatic reads for grading.

No completed OMR sample images were provided. Automated logic tests cover archive matching for Classes 10 and 12, key parsing, mark classification, OCR question-number mapping, scoring, question ordering, and saved record construction. Reading accuracy still needs to be checked against anonymized classroom sheets before relying on automatic reads for grading.
