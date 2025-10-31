import { useState, useEffect } from 'react';
import { getLeaderboard } from '../lib/mongodb';
import { Trophy, Target, Medal } from 'lucide-react';

export default function Leaderboard({ gameId }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const result = await getLeaderboard(gameId, 10);
        if (result.success) {
          setScores(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
    // Refresh every 3 seconds for real-time updates
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const getRankIcon = (rank) => {
    if (rank === 0) return <Medal className="text-yellow-500" size={20} strokeWidth={2.5} fill="currentColor" />;
    if (rank === 1) return <Medal className="text-gray-400" size={20} strokeWidth={2.5} fill="currentColor" />;
    if (rank === 2) return <Medal className="text-amber-600" size={20} strokeWidth={2.5} fill="currentColor" />;
    return <span className="text-sm font-bold text-gray-600">{rank + 1}.</span>;
  };

  return (
    <div className="h-full bg-white rounded-xl shadow-lg border-2 border-green-100 overflow-hidden flex flex-col">
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 flex-shrink-0"></div>
      
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-extrabold text-gray-800 mb-3 flex items-center gap-2 flex-shrink-0">
          <Trophy className="text-yellow-500" size={24} strokeWidth={2.5} />
          <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-transparent bg-clip-text">Top Players</span>
        </h3>
        
        {scores.length === 0 ? (
          <div className="text-center py-6 flex-shrink-0">
            <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" strokeWidth={1.5} />
            <p className="text-gray-600 text-sm font-semibold mb-1">No scores yet!</p>
            <p className="text-gray-500 text-xs">Be the first to play!</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin">
            {scores.map((entry, index) => (
              <div
                key={`${entry.walletAddress}-${entry.score}`}
                className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-200 hover:shadow-md ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 shadow-md' 
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300 shadow-sm'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 shadow-sm'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-400 text-white shadow-lg' :
                    index === 1 ? 'bg-gray-400 text-white shadow-lg' :
                    index === 2 ? 'bg-amber-400 text-white shadow-lg' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate mb-0.5 font-mono">
                      {entry.walletAddress ? `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}` : 'Unknown'}
                    </p>
                    {entry.petName && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {entry.petName.replace(/^FROTH\s+Pet\s+#?/i, 'Pet #')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className={`font-extrabold text-lg ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-600' :
                    index === 2 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold">pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

