import { Router } from 'express';
import { upload } from '../middleware/upload';
import { runMatchAgent } from '../agents/matchAgent';
import { runCoverLetterAgent } from '../agents/coverLetterAgent';
import { runInterviewAgent } from '../agents/interviewAgent';
import { parseFile } from '../lib/parser';
import { db } from '../db/client';

export const jobsRouter = Router();

// Accepts either JSON body { jdText } or a file upload
jobsRouter.post('/analyze', upload.single('jd'), async (req, res) => {
  try {
    let jdText: string | undefined = req.body?.jdText;

    if (!jdText && req.file) {
      jdText = await parseFile(req.file.buffer, req.file.mimetype);
    }

    if (!jdText) {
      res.status(400).json({ error: 'Provide jdText in body or upload a JD file' });
      return;
    }

    const result = await runMatchAgent(jdText);

    const { rows } = await db.query(
      'INSERT INTO jobs (jd_text) VALUES ($1) RETURNING id',
      [jdText]
    );
    const jobId = rows[0].id as string;

    res.json({ jobId, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze job description' });
  }
});

jobsRouter.post('/cover-letter', async (req, res) => {
  try {
    const { resumeId, jobId, jdText, companyName, customPrompt } = req.body;

    if (!resumeId || !jdText) {
      res.status(400).json({ error: 'resumeId and jdText are required' });
      return;
    }

    // Get the latest version number for this resume + job combo
    const { rows: versionRows } = await db.query(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM cover_letters WHERE resume_id = $1 AND job_id = $2',
      [resumeId, jobId]
    );
    const nextVersion = (versionRows[0].max_version as number) + 1;

    // Run the cover letter agent
    const result = await runCoverLetterAgent(resumeId, jdText, companyName, customPrompt);

    // Save to database
    const { rows } = await db.query(
      'INSERT INTO cover_letters (resume_id, job_id, content, company_name, version, user_prompt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [resumeId, jobId, result.content, result.companyName, nextVersion, customPrompt ?? null]
    );

    res.json({
      id: rows[0].id,
      content: result.content,
      companyName: result.companyName,
      version: nextVersion,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

jobsRouter.post('/interview-prep', async (req, res) => {
  try {
    const { resumeId, jobId, jdText, gaps } = req.body;

    if (!resumeId || !jdText) {
      res.status(400).json({ error: 'resumeId and jdText are required' });
      return;
    }

    // Run the interview prep agent
    const result = await runInterviewAgent(resumeId, jdText, gaps);

    // Save to database
    const { rows } = await db.query(
      'INSERT INTO interview_preps (resume_id, job_id, questions_json) VALUES ($1, $2, $3) RETURNING id',
      [resumeId, jobId, JSON.stringify(result)]
    );

    res.json({
      id: rows[0].id,
      questions: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate interview prep' });
  }
});
