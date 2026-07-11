import { useLocation, useNavigate } from 'react-router-dom';
import MatchScoreCard from '../components/MatchScoreCard';
import SkillGapChart from '../components/SkillGapChart';

export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();

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

  const { match } = state;

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
    </div>
  );
}
