# Resume-analysis helper: read resume → propose target job types

Reusable procedure for reading a user's ingested resume file(s), summarizing their
skills, and proposing likely target job types for confirmation. The setup wizard
cites this doc to produce `job-focus.md`; maintenance skills that refresh job focus
after a resume change should cite it too.

The output of this procedure is confirmed prose suitable for `job-focus.md`, which is
free-form advisory Markdown (see the "job-focus.md" section of the data contract at
[`../../../references/data-contract.md`](../../../references/data-contract.md)). Never
treat it as structured machine state — that role belongs to `config.json` and
`profile.json`.

## Procedure

1. **Locate the resume files.** Look in the working folder's `resume/` directory for
   the ingested variants (`resume-a.*`, `resume-b.*`, …). If several variants exist,
   read each; note where they differ (they usually emphasize different domains).

2. **Read the content.** Use the Read tool to read each resume file. It handles PDFs
   and text/Markdown. If a file cannot be read (e.g. an unreadable binary format),
   tell the user and ask them to paste or summarize the relevant content instead of
   guessing.

3. **Summarize skills.** From the resume text, extract a concise picture of the
   applicant: core skills and technologies, years/seniority signal, notable domains
   or industries, and any specializations. Keep it to a few lines — this is a
   proposal, not a report.

4. **Propose likely target job types.** Based on the summary, propose a short list
   (a few lines) of job titles / role types the applicant is well suited for,
   spanning realistic seniority (e.g. "Senior Frontend Engineer", "Full-Stack
   Engineer", "Platform Engineer"). If multiple resume variants target different
   domains, note which variant leans toward which role cluster.

5. **Invite edits and confirm (GATE).** Present the summary and proposed job types
   and explicitly ask the user to add, remove, or change entries — and to add any
   guidance the resume does not capture (target seniority, locations, remote
   preference nuances, compensation expectations, companies to include/avoid). Do not
   proceed until the user confirms the final set.

6. **Emit job-focus prose.** Turn the confirmed result into clear Markdown prose for
   `job-focus.md`: target titles and seniority, key technologies/skills, target
   domains, location/remote guidance, compensation expectations, and any other search
   guidance the user gave. Write it as human-readable prose, not as JSON or a rigid
   schema.

## Notes

- This procedure only reads resumes and produces advisory text. It does not change
  `config.json`, `profile.json`, or `jobs.json`.
- Keep proposals grounded in the resume content; when the resume is thin, ask the
  user rather than inventing experience.
