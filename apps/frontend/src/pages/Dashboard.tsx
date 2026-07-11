import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MatchScoreCard from '../components/MatchScoreCard';
import SkillGapChart from '../components/SkillGapChart';
import SuggestionsReport from '../components/SuggestionsReport';
import CoverLetterModal from '../components/CoverLetterModal';

const API = import.meta.env.VITE_API_URL ?? '';

interface Suggestion {
  missingKeywords: string[];
  sectionsToReorder: Array<{
    section: string;
    currentPosition: string;
    suggestedPosition: string;
    reason: string;
  }>;
  bulletsToStrengthen: Array<{
    currentBullet: string;
    issue: string;
    suggestion: string;
  }>;
  skillsToEmphasize: string[];
  contentToExpand: Array<{
    section: string;
    reason: string;
  }>;
  contentToCondense: Array<{
    section: string;
    reason: string;
  }>;
  overallRecommendation: string;
}

export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<{ data: Suggestion; version: number } | null>(null);
  const [coverLetter, setCoverLetter] = useState<{ content: string; companyName: string; version: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [error, setError] = useState('');

  if (!state?.match) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-400">No results yet.</p>
        <button
          onClick={() => navigate('/upload')}
          className="text-indigo-400 hover:underline text-sm"
        >
          Go back to upload
        </button>
      </div>
    );
  }

  const { match, parsed, resumeId, jobId, jdText } = state;

  async function handleGenerateSuggestions() {
    if (!resumeId || !jdText) {
      setError('Missing resume or job description data');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const { data } = await axios.post(`${API}/api/resume/tailor`, {
        resumeId,
        jobId,
        jdText,
      });

      setSuggestions({
        data: data.suggestions,
        version: data.version,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!resumeId || !jdText) {
      setError('Missing resume or job description data');
      return;
    }

    setIsGeneratingCoverLetter(true);
    setError('');

    try {
      const { data } = await axios.post(`${API}/api/jobs/cover-letter`, {
        resumeId,
        jobId,
        jdText,
      });

      setCoverLetter({
        content: data.content,
        companyName: data.companyName,
        version: data.version,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Match Results</h1>
        <button
          onClick={() => navigate('/upload')}
          className="text-sm text-indigo-400 hover:underline"
        >
          Analyze another job
        </button>
      </div>

      <MatchScoreCard
        score={match.score}
        strengths={match.strengths}
        gaps={match.gaps}
        recommendation={match.recommendation}
      />

      <SkillGapChart strengths={match.strengths} gaps={match.gaps} />

      {/* Resume Suggestions Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">AI Resume Coach</h3>
              <p className="text-sm text-gray-400 mt-1">
                Get specific suggestions on how to improve your resume for this role
              </p>
            </div>
            <button
              onClick={handleGenerateSuggestions}
              disabled={isGenerating}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Analyzing...' : 'Get Suggestions'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {suggestions && (
          <SuggestionsReport
            suggestions={suggestions.data}
            version={suggestions.version}
          />
        )}
      </div>

      {/* Cover Letter Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Cover Letter Generator</h3>
            <p className="text-sm text-gray-400 mt-1">
              Generate a personalized cover letter for this role
            </p>
          </div>
          <button
            onClick={handleGenerateCoverLetter}
            disabled={isGeneratingCoverLetter}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
          </button>
        </div>
      </div>

      {/* Cover Letter Modal */}
      {coverLetter && (
        <CoverLetterModal
          content={coverLetter.content}
          companyName={coverLetter.companyName}
          version={coverLetter.version}
          onClose={() => setCoverLetter(null)}
        />
      )}
    </div>
  );
}
