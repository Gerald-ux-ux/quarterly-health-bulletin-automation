# Quarterly Health Bulletin

A browser-based prototype that reads DHIS2-style CSV reports and produces a Quarterly Health Bulletin. Users upload the source files, generate calculations, review three report sections, and download each section as a separate CSV file.

## What It Does

The application produces three reports:

1. **Top Facilities**: ranks facilities by total deliveries across all reporting months.
2. **Maternal & Newborn Indicators**: reports stillbirth rate, neonatal mortality rate, and cause-specific proportions for asphyxia, prematurity, and sepsis.
3. **Performance Score**: currently implements Clinical Effectiveness by combining clinical survival outcomes with death-audit practice from governance data.

Critical Readiness and Operational Quality are displayed as `Coming soon`. Clinical Effectiveness was deliberately implemented first because it combines patient outcomes and institutional accountability into one high-impact score.

## Required Input Files

The prototype currently validates files by exact filename:

- `clinical_neonatal.csv`
- `facilities.csv`
- `governance.csv`

The application also accepts these files for the broader performance-scoring pipeline:

- `healthcare_workers.csv`
- `operations.csv`

Filename validation was chosen as a clear, inexpensive safeguard for the six-week prototype scope. A future phase could inspect headers and validate schemas so equivalent files could use different names.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Check the project

```bash
npm run lint
npm run build
```

## How to Use It

1. Open the home page.
2. Drag and drop the required CSV files into the uploader, or select them through the file picker.
3. Select **Generate Metrics**.
4. Review the three report sections at `/results`.
5. Download the individual CSV report needed for the bulletin.

The generated report is stored in browser `sessionStorage` while navigating from the upload page to the results page. No CSV data is uploaded to a server in this prototype.

## Installed Packages

### Runtime dependencies

- **Next.js**: application framework, routing, and production build tooling.
- **React** and **React DOM**: UI components and browser rendering.
- **Papa Parse**: parses uploaded CSV files and serializes report data for downloads.
- **react-drag-drop-files**: provides the drag-and-drop and file-picker upload control.

### Development dependencies

- **TypeScript**: static typing for the application and calculation contracts.
- **ESLint** and **eslint-config-next**: code-quality and Next.js checks.
- **@types/node**, **@types/react**, **@types/react-dom**: TypeScript types for the runtime and React APIs.
- **@types/papaparse**: TypeScript types for Papa Parse.
- **Tailwind CSS** and **@tailwindcss/postcss**: utility styling and CSS processing.

## Project Structure

```text
app/
  page.tsx                    Upload page and CSV validation
  results/page.tsx            Dashboard and separate CSV downloads
  services/process-csv.ts     Calculations and report shaping
  globals.css                Global uploader and results-table styles
```

## Deployment

This client-side Next.js application can be deployed to Vercel:

1. Push the repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Keep the detected Next.js framework settings.
4. Deploy and open the generated production URL.


