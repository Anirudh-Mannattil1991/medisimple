# MediSimple

**Understand your health records, finally.**

MediSimple is a single-file, browser-based medical document interpreter powered by Claude AI. Upload a photo of a lab report, paste discharge notes, or drop in a prescription — and get a plain-English breakdown in seconds. No account required. No data leaves your device.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Using MediSimple](#using-medisimple)
  - [Uploading a Document](#uploading-a-document)
  - [Reading the Results](#reading-the-results)
  - [Ask Follow-Up Questions](#ask-follow-up-questions)
  - [Export as Image](#export-as-image)
  - [Compare Two Visits](#compare-two-visits)
  - [Medication Schedule](#medication-schedule)
  - [Symptom Journal](#symptom-journal)
- [Privacy & Data Handling](#privacy--data-handling)
- [Reading Level Selector](#reading-level-selector)
- [Dark Mode](#dark-mode)
- [Document History & Trends](#document-history--trends)
- [Supported Document Types](#supported-document-types)
- [Technical Notes](#technical-notes)
- [Disclaimer](#disclaimer)

---

## Overview

Medical documents are dense, jargon-heavy, and written for clinicians — not patients. MediSimple bridges that gap. It uses Claude's vision and language capabilities to extract every term, value, and finding from your document and translate it into language anyone can understand.

Everything runs in your browser. The only outbound call is to the Claude API to perform the analysis — your raw files are never sent to any MediSimple server and are never stored anywhere.

---

## Features

| Feature | Description |
|---|---|
| **AI Document Analysis** | Claude reads images, PDFs, and pasted text to extract all medical data |
| **Plain-English Summary** | 2–4 sentence overview of what the document says |
| **Severity Rating** | Normal / Watch / Urgent — with a one-line reason |
| **Medical Terms Explained** | Every abbreviation, drug name, and clinical term decoded |
| **Flagged Values** | Out-of-range results highlighted with explanations |
| **Values at a Glance** | All numeric results (labs, vitals) in a scannable grid |
| **Drug Interaction Check** | Flags known interactions between all medications in the document |
| **Doctor Questions** | 4–6 specific questions to bring to your next appointment |
| **Next Steps** | Concrete actions based on the findings |
| **Follow-Up Chat** | Ask anything about your document in plain language |
| **Symptom Journal** | Log symptoms between visits; included as context in your next analysis |
| **Reading Level Selector** | ELI10 / Standard / Keep medical terms |
| **Export as Image** | Save a Summary Card, Doctor Report, or Medication Schedule as a PNG |
| **Copy for Doctor** | One-click plain-text block to paste into a patient portal message |
| **Compare Visits** | AI-powered side-by-side comparison of any two documents |
| **Medication Schedule** | Smart time-slot assignment (morning / midday / evening / bedtime) based on each drug |
| **Trend Tracking** | Tracks numeric values across multiple lab results over time |
| **Dark Mode** | Full dark theme, persisted across sessions |
| **Privacy by Design** | No account, no server storage, no raw document retention |

---

## How It Works

1. You upload a file or paste text into MediSimple.
2. Your document is sent — along with a structured prompt — to the [Claude API](https://www.anthropic.com/api) (`claude-sonnet-4-20250514`) via a direct browser request.
3. Claude returns a structured JSON object containing the full analysis.
4. MediSimple renders that JSON into the result cards you see on screen.
5. Only the AI-generated summary (never your raw document) is optionally saved to your browser's `localStorage` for trend tracking.

```
Your browser → Claude API → Structured JSON → Rendered results
                ↑
        (raw file cleared from memory immediately after)
```

---

## Getting Started

MediSimple is a single HTML file — no installation, no build step, no dependencies to install.

**To run it:**

1. Download `MediSimple_v3.html`
2. Open it in any modern browser (Chrome, Firefox, Safari, Edge)
3. That's it

> **Note:** MediSimple requires an active internet connection to reach the Claude API. The API key is handled at the proxy layer — no key configuration is needed by the user.

---

## Using MediSimple

### Uploading a Document

Select the document type from the tab bar at the top of the upload card:

- **Lab Result** — blood panels, metabolic panels, urinalysis
- **Prescription / Meds** — medication lists, prescription printouts
- **Discharge Summary** — hospital discharge paperwork
- **Radiology Report** — X-ray, MRI, CT, ultrasound reports
- **Other** — any other clinical document

Then choose your input method:

- **Upload file / photo** — drag and drop, or click to browse. Accepts JPG, PNG, HEIC, WEBP, PDF, and multiple files at once. Claude Vision reads handwriting too.
- **Paste text** — copy and paste the text content of a document directly.

Fill in the date and an optional label (e.g. "Annual blood panel – April 2026"), then click **Analyze**.

You can also click **Load sample** to see MediSimple in action with example data before uploading your own documents.

### Reading the Results

Results are organised into cards:

- **Severity banner** — the overall assessment (Normal / Watch / Urgent) with a one-line explanation
- **Flagged findings** — anything out of range or worth noting, colour-coded by severity (info / warning / critical)
- **Medical terms explained** — every term broken down into plain language, with normal ranges where applicable
- **Values at a glance** — all numeric results in a grid, colour-coded by status
- **Ask your doctor** — specific, document-relevant questions to raise at your next appointment
- **Next steps** — concrete actions to take based on the findings
- **Drug interaction check** — any known interactions between medications mentioned in the document

### Ask Follow-Up Questions

Below the results cards is a chat panel. Type any question about your document — or tap one of the suggested chips — and get a plain-English answer from Claude with context from your specific document.

Example questions:
- "What does this mean for my diet?"
- "Should I be worried about any of these values?"
- "What follow-up tests should I ask for?"

Answers are formatted as readable prose — no markdown symbols.

### Export as Image

Click the **Export** button in the result header to open the export panel. Choose from three export formats:

**Summary Card** — a clean one-page overview showing severity, key values, and your doctor questions list. Designed to share with a family member or carer.

**Doctor Report** — a structured patient report with flagged values, questions, and next steps. Formatted for pasting into a patient portal or printing before an appointment.

**Medication Schedule** — a time-blocked daily schedule with each medication assigned to its recommended time slot (see [Medication Schedule](#medication-schedule) below).

Click **Save as Image** to download a high-resolution PNG of whichever view is selected. You can also use **Copy for Doctor** in the result header to copy a plain-text version directly to your clipboard.

### Compare Two Visits

When you have two or more documents in your history, a **Compare** button appears in the result header. Click it, select the second document, and MediSimple asks Claude to compare both summaries and return:

- What **improved** between visits
- What **worsened** between visits
- What **stayed the same**
- A short narrative describing the overall trend

### Medication Schedule

The Medication Schedule export automatically assigns each detected medication to its clinically appropriate time slot based on a built-in reference of over 100 common drug patterns:

| Time | Examples |
|---|---|
| **Morning 🌅** | Levothyroxine, lisinopril, metformin (AM dose), furosemide, sertraline |
| **Midday ☀️** | Metformin (midday dose), some antibiotics, buspirone |
| **Evening 🌆** | Warfarin, metformin (PM dose), apixaban, doxycycline |
| **Bedtime 🌙** | Statins (atorvastatin, rosuvastatin), mirtazapine, quetiapine, montelukast, zolpidem |

Unrecognised medications are placed in the morning slot as a safe default. A disclosure note is always shown at the bottom reminding you to check your actual prescription labels.

### Symptom Journal

The symptom journal at the bottom of each result view lets you log symptoms between visits (e.g. "fatigue since Monday", "headache after meals"). Logged symptoms are automatically included as context in your next document analysis, so Claude can note any connections.

---

## Privacy & Data Handling

MediSimple is built around a strict privacy model:

- **Raw files are never stored.** Uploaded images and PDFs are read into browser memory, sent to the Claude API for analysis, then immediately cleared.
- **Raw text is never stored.** Pasted document text is sent to the Claude API and discarded.
- **Only AI summaries are saved.** The structured JSON result — containing no raw document content — is optionally saved to your browser's `localStorage` to enable trend tracking.
- **No account required.** There is no login, no user profile, and no server-side session.
- **No MediSimple server.** The only network call is directly from your browser to the Anthropic API.
- **You can delete everything.** Use the trash icon on any history item to delete individual documents, or use "Clear all local data" in the sidebar to wipe everything at once.

---

## Reading Level Selector

Before analyzing a document, choose how you want the results written:

| Option | Description |
|---|---|
| **ELI10 😊** | Explain like I'm 10 — very simple words, short sentences, no jargon |
| **Standard** | 8th-grade reading level — the default, suitable for most patients |
| **Keep medical terms** | Preserves clinical language for medically literate readers |

This setting affects the entire analysis output, including the summary, term explanations, flagged findings, and doctor questions.

---

## Dark Mode

Click the **Dark / Light** toggle in the top-right corner of the navigation bar to switch themes. Your preference is saved to `localStorage` and applied automatically on your next visit.

---

## Document History & Trends

Every document you analyze is saved to your browser's local history. Access past results from the sidebar on the left. If you have two or more lab results, MediSimple automatically displays a **Value trends** panel in the sidebar showing which metrics went up, down, or held steady across visits.

To delete a document, hover over it in the sidebar and click the trash icon that appears. To clear all history, use the "Clear all local data" button at the bottom of the sidebar.

---

## Supported Document Types

MediSimple works with any clinical document. It is optimised for:

- **Lab results** — CBC, metabolic panels, lipid panels, HbA1c, thyroid, liver function, kidney function
- **Prescriptions** — medication lists, drug names, dosages, frequency
- **Discharge summaries** — hospital discharge paperwork, inpatient notes
- **Radiology reports** — X-ray, MRI, CT scan, ultrasound findings
- **Other** — GP letters, specialist referrals, immunisation records, allergy reports

File formats accepted: **JPG, PNG, HEIC, WEBP, PDF**. Multiple files can be uploaded together (e.g. front and back of a document).

---

## Technical Notes

- **Model:** `claude-sonnet-4-20250514`
- **Max tokens per analysis:** 4,096
- **Architecture:** Single HTML file — no build system, no npm, no server
- **Storage:** Browser `localStorage` only — keys `ms3_hist`, `ms3_syms`, `ms3_dark`
- **Image export:** Uses [html2canvas](https://html2canvas.hertzen.com/) (loaded on demand from cdnjs)
- **Fonts:** DM Sans + DM Serif Display via Google Fonts
- **Browser support:** All modern browsers (Chrome, Firefox, Safari, Edge)

---

## Disclaimer

MediSimple is an informational tool only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional about any health concerns or before making any decisions based on information provided by this tool. Never disregard professional medical advice or delay seeking it because of something you read in a MediSimple analysis.
