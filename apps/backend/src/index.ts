import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resumeRouter } from './routes/resume';
import { jobsRouter } from './routes/jobs';
import { initCollection } from './kb/knowledgeBase';

const app = express();
const PORT = process.env.PORT ?? 4001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/resume', resumeRouter);
app.use('/api/jobs', jobsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function start() {
  await initCollection();
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch(console.error);
