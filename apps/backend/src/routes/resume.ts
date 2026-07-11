import { Router } from 'express';
import { upload } from '../middleware/upload';
import { runResumeAgent } from '../agents/resumeAgent';
import { runOptimizerAgent } from '../agents/optimizerAgent';
import { db } from '../db/client';

export const resumeRouter = Router();

resumeRouter.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { buffer, mimetype, originalname } = req.file;
    const result = await runResumeAgent(buffer, mimetype, originalname);

    await db.query(
      'INSERT INTO resumes (id, filename, raw_text, parsed_json) VALUES ($1, $2, $3, $4)',
      [result.docId, originalname, result.rawText, JSON.stringify(result.parsed)]
    );

    res.json({ docId: result.docId, parsed: result.parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

resumeRouter.post('/tailor', async (req, res) => {
  try {
    const { resumeId, jobId, jdText, customPrompt } = req.body;

    if (!resumeId || !jdText) {
      res.status(400).json({ error: 'resumeId and jdText are required' });
      return;
    }

    // Get the latest version number for this resume + job combo
    const { rows: versionRows } = await db.query(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM resume_suggestions WHERE resume_id = $1 AND job_id = $2',
      [resumeId, jobId]
    );
    const nextVersion = (versionRows[0].max_version as number) + 1;

    // Run the optimizer agent to get suggestions
    const suggestions = await runOptimizerAgent(resumeId, jdText, customPrompt);

    // Save to database (storing suggestions as JSONB)
    const { rows } = await db.query(
      'INSERT INTO resume_suggestions (resume_id, job_id, suggestions_json, version, user_prompt) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [resumeId, jobId, JSON.stringify(suggestions), nextVersion, customPrompt ?? null]
    );

    res.json({
      id: rows[0].id,
      suggestions,
      version: nextVersion,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});
