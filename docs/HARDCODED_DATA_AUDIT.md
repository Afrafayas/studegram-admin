# Hardcoded data audit

Audited the source files in `studegram-admin/src` and `studegram-portal/src`, and inspected the backend routes, controllers, and models supplying these screens. UI labels, permission identifiers, allowed status values, country/phone-code reference lists, design tokens, and form examples are configuration rather than business records.

## Admin portal

| Page or component | Removed or corrected | Data source |
| --- | --- | --- |
| Daily Report | Demo application fallback; all applications assigned to a fixed Tuesday; incorrect today/active counts | `/applications`, actual creation dates and statuses |
| Applications | Preset staff choices, invented intake options and destination country, unconditional verified-document labels | `/applications`, `/users`, `/intakes`; uploaded documents |
| Students | Local-only onboarding and unconditional passport verification claims | `/students` for creation; student and application uploads for documents |
| Become Our Partner | Generated sample proof images, fabricated partner code, fixed initial password, unconditional document verification labels | `/partners`, stored upload URLs; backend-generated account credentials |
| Partners | Mock status updates, local-only invitation records, generated partner codes | `/partners` POST and PUT responses |
| Staff Management | Demo staff directory supplied by the parent; localhost-only role lookup | `/users`, configured API client for `/roles` |
| Portal Settings | Demo universities, courses, intakes and document configuration arrays; mock save/delete branches | `/universities`, `/courses`, `/intakes`; empty initial state for unsupported configuration collections |
| Commissions | Assumed tuition of 15,000, rate of 10%, payout of 1,500, and generated commission identifiers | `/commissions`, stored amounts, rates and identifiers |
| Admin Report | Assumed UK destination and generated reference numbers | Application data and actual database identifiers |
| Create Student Application | Generated Gmail addresses and passport numbers, invented staff choices | Required student email input, optional passport input; existing students/staff and API options |
| Tourist Packages | Three fictional packages and prices | Empty state; no package API/model exists |
| Roles & Permissions | Client-side role records and hardcoded hierarchy entries appended to server results | `/roles`; hierarchy derives from returned role names and descriptions |
| Roles audit log | Fabricated historical staff activity | `/activity-logs` plus actions actually performed in the current session |
| Application Chat | Generated sample conversation on API failure | Application chat endpoint; errors are displayed |
| Header notifications | Unused fabricated notification records | `/notifications` |
| Staff Activity screens | Assumed country and loopback IP display values | Recorded activity values, or a missing-value indicator |
| To-do List | Local-only task creation and updates | `/todos` GET, POST, PUT and DELETE |

Empty API results now clear the main directories instead of retaining demo records. API failures do not inject sample data.

## Agent portal

| Page or component | Removed or corrected | Data source |
| --- | --- | --- |
| Search Courses | Seventeen fictional courses, fees, intake dates and university options; fake specification-download success | `/courses`, populated universities and intakes; specifications show the returned record |
| Universities | Fixed rating of 4.8 and unsupported “Top Choice” endorsement | `/universities`, stored rankings and course fees |
| Scholarships | Bundled fictional scholarships, award amounts, eligibility criteria and dates; fixed current date | `/scholarships`; country inferred only by matching an actual `/universities` record; current clock |
| Scholarship Details | Invented required documents, eligibility requirements and application steps | Fields present on the scholarship record; missing information is stated explicitly |
| University Deadlines | Four fictional rows and fixed category counts | Explicit dates on course/scholarship records; counts derive from returned rows |
| Knowledge Hub | Fixed fees, ratings, university profiles, visa rules, proof-of-funds and work-policy claims | `/universities` for university information; published guide/policy notices from `/notices` |
| Webinars | Four demo events and automatic POST seeding when the collection is empty; fixed university choices, stock posters and placeholder video links | `/webinars`, `/universities`; user-created events still persist normally; missing posters/links are handled explicitly |
| Notices | Ten bundled notices and localStorage as the business-data source | `/notices` GET and POST; stored poster/badge fields supported by the backend change |
| Notification Popup | Popups generated from bundled demo notices | Active agent/all-audience notices from `/notices` |
| Application Details | Sample verification note and static document checklist; notes lost on refresh | Uploaded application documents; notes use the existing application-comments endpoint |
| Add Application | Fixed intake dates, unsupported destination choices, position-based student/university/course reference numbers | `/intakes`, `/universities`, `/courses`, `/students`; original names and IDs |
| Edit Application | Unsupported destination choices | `/universities`, `/courses`, current application/student values |
| Dashboard | Estimated application deadlines manufactured from intake months | Explicit application deadline fields only |
| Commissions | Assumed tuition and commission rate | Returned application/commission values; unset amounts remain unconfigured |
| Staff Management / Role Permissions | Client-side preset role records appended to real roles | `/roles`, filtered to Agent portal roles |
| Sidebar / Profile | Placeholder user identity and unconditional email verification | Actual partner profile; missing values are not presented as verified |
| Shared application loader | Position-based CAMS references, assumed paid status, assumed intake and commission rate | Actual application reference/database ID, payment status, intake and commission fields |

Manual course requests have no backend endpoint. The former success-only form has been replaced with a contact-administrator message. No requests are falsely reported as saved.

## Backend sources corrected

- Staff activity GET handlers no longer create demo sessions or add fictional operational actions to real sessions.
- Commission models, claims and updates no longer inject 15,000 fees, 10% rates, or 1,500 payouts. Unconfigured commission values start at zero and remain subject to the existing commission-setting workflow.
- New applications no longer receive a fixed September 2026 intake or 10% commission rate.
- Login uses existing database users and their stored password hashes. Removed preset-user creation and the preset-password override. Existing accounts are not deleted or reset.
- Admin login returns stored country, countries and phone fields so client profile/scope information does not depend on a guessed country.
- Notice posters and badges are stored in optional schema fields so the notice page can reload original submitted values.

## Limits and validation

- The backend has no dedicated tour-package, country-guide, scholarship-document or application-deadline management collection. Those details cannot be reconstructed from the removed samples. Screens use available published records or explain that information has not been provided.
- Previously seeded or saved demo records may already exist in the database. No database rows were deleted or rewritten during this audit, because the old seed routines did not reliably distinguish demo records from legitimate records.
- Both frontend production builds pass. Twenty-one automated regression tests pass: twelve data-source/authentication tests and nine existing partner-referral tests. These include real password hashing and JWT signing with isolated test values, valid/invalid/suspended login behavior, mapping, missing values, published deadlines, read-only staff reporting and zero commission amounts.
- Ten agent pages and three closed modals pass server-rendered smoke checks.
- Seventeen checks pass in headless Chrome against the actual frontend sources. Covered flows: admin and agent API login; student document filename display; returning to the application list; both portals' failed submissions/retries; admin success redirect; agent success/close/history refresh; document upload payloads; stored commission amounts; task create/complete/reload/delete; agent courses, universities, notices, webinars and roles; course specifications; empty webinars without automatic sample creation. No uncaught JavaScript exceptions occurred. See [browser results](browser-flow-results.json).
- Admin lint completes with warnings. Agent lint has existing failures; comparison against the original sources found no additional error categories/counts per file.
- No live database or API mutation was used for validation.

## Effect on working flows

No regressions were found in the covered API-backed working flows. Submission failure preserves the form; successful admin submission returns to the applications list; the agent retains its success/close flow. Existing application submission, upload, list navigation, catalog browsing, commissions display, task persistence and stored-password authentication were exercised.

Removing fabricated content intentionally changes demo/offline behavior: failed requests no longer show invented records or pretend that a save succeeded. Missing tour packages, guide details or deadlines show an empty/missing-data state. Login no longer accepts a preset password in place of a stored account password.

Browser APIs were intercepted with fixtures, and backend tests used isolated model stubs. Live MongoDB connectivity, S3 transfers, email delivery and production deployment were not tested, so these checks do not establish that every external service works end to end.
