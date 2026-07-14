import { Router } from 'express';
import { upsertChunks } from '../kb/knowledgeBase';

export const kbRouter = Router();

function extractRepoPath(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : null;
}

function chunkText(text: string, size = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks;
}

kbRouter.post('/github', async (req, res) => {
  try {
    const { repoUrl, resumeId } = req.body;

    if (!repoUrl || !resumeId) {
      res.status(400).json({ error: 'repoUrl and resumeId are required' });
      return;
    }

    const repoPath = extractRepoPath(repoUrl);
    if (!repoPath) {
      res.status(400).json({ error: 'Invalid GitHub URL' });
      return;
    }

    // Try common README filenames
    const candidates = ['README.md', 'readme.md', 'README.rst', 'README.txt'];
    let readmeText: string | null = null;

    for (const filename of candidates) {
      const rawUrl = `https://raw.githubusercontent.com/${repoPath}/HEAD/${filename}`;
      const response = await fetch(rawUrl);
      if (response.ok) {
        readmeText = await response.text();
        break;
      }
    }

    if (!readmeText) {
      res.status(404).json({ error: 'README not found in this repository' });
      return;
    }

    // Strip markdown syntax to get clean text
    const cleanText = readmeText
      .replace(/```[\s\S]*?```/g, '')   // remove code blocks
      .replace(/`[^`]+`/g, '')          // remove inline code
      .replace(/#{1,6}\s/g, '')         // remove headings
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // keep link text only
      .replace(/[*_~]/g, '')            // remove emphasis markers
      .trim();

    const chunks = chunkText(cleanText);
    await upsertChunks(chunks, { source: 'github', docId: resumeId });

    console.log(`GitHub KB: indexed ${chunks.length} chunks from ${repoPath} for resumeId=${resumeId}`);

    res.json({
      repoPath,
      chunksIndexed: chunks.length,
      message: `Successfully indexed README from ${repoPath}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to ingest GitHub README' });
  }
});
