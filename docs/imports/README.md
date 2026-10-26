# Course Excel uploads

Use `10_sample_courses.xlsx` with the admin Import Excel action. The CSV is also provided for editing; save it as `.xlsx` before upload.

The sample contains 10 illustrative courses across the three universities currently in the configured database. The university and intake references were checked on 26 October 2026. Course offerings and tuition amounts are test data, not verified university prices. No sample records were inserted into the database.

The name `University of British Columbiaa` reflects the current database spelling. Correct the university record separately if needed.

Columns: Course Program Title *, Assign University *, Degree Level, Duration, Currency, Tuition Fee, Fee Period, Category, Course Overview & Description, Available Intakes. Only title and university are required. Use a numeric tuition amount with currency and period in separate columns. Fee Period accepts Per year, Per semester, or Complete course. An omitted period remains unspecified unless a legacy fee suffix identifies it. Legacy currency defaults to INR unless identified in the fee.

Headers, course duplicate checks, university names, and intake names tolerate capitalization, spaces and punctuation. Accents and &/and variations are normalized. University and intake references must resolve to exactly one existing database record. Missing or ambiguous records reject that row; the importer never guesses or creates referenced records.

All month abbreviations are supported, including Jan/January and Sep/Sept/September. Jan2027, Jan. 2027, January-2027, and 2027/Jan resolve to January 2027. The year is required when the database intake includes it. Separate multiple intakes with commas, semicolons, pipes, or line breaks. Repeated references are linked once.

Duplicate courses are checked per university against existing records and successful rows in the current file. Row errors include spreadsheet row numbers. A failed row does not prevent a corrected row of the same course from being imported.

Restart the backend after deploying these changes, then download a fresh official template from the admin portal.
