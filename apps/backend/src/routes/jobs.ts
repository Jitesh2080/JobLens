import { Router } from 'express';
import { upload } from '../middleware/upload';
import { runMatchAgent } from '../agents/matchAgent';
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
