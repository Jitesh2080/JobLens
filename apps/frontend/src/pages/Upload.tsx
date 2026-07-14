import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? '';

export default function Upload() {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeFile || !jdText.trim()) {
      setError('Please upload your resume and provide a job description.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const { data: resumeData } = await axios.post(`${API}/api/resume/upload`, formData);

      // Ingest GitHub README if URL provided
      if (githubUrl.trim()) {
        await axios.post(`${API}/api/kb/github`, {
          repoUrl: githubUrl.trim(),
          resumeId: resumeData.docId,
        });
      }

      const { data: matchData } = await axios.post(`${API}/api/jobs/analyze`, { jdText });

      navigate('/dashboard', {
        state: {
          parsed: resumeData.parsed,
          resumeId: resumeData.docId,
          match: matchData,
          jobId: matchData.jobId,
          jdText: jdText,
        },
      });
    } catch (err) {
      setError('Something went wrong. Check the console for details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h1 className="text-2xl font-semibold">Analyze a Job</h1>

      {/* Resume upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Resume (PDF or DOCX)</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-400 file:mr-4 file:rounded file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
        />
        {resumeFile && <p className="text-xs text-gray-400">{resumeFile.name}</p>}
      </div>

      {/* GitHub repo URL */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          GitHub Repository <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500">
          Add a GitHub project to strengthen your match context with real project experience
        </p>
      </div>

      {/* JD input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Job Description</label>
        <textarea
          rows={10}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here..."
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze Match'}
      </button>
    </form>
  );
}
