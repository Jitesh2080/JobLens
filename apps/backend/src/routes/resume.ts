import { Router } from 'express';
import { upload } from '../middleware/upload';
import { runResumeAgent } from '../agents/resumeAgent';
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
