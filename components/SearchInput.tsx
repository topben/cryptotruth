import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, AlertTriangle, Shield } from 'lucide-react';

interface SearchInputProps {
  onSearch: (handle: string) => void;
  isLoading: boolean;
}

// Categorized interesting handles for quick search
const SUGGESTED_HANDLES = {
  controversial: [
    { handle: 'zhusu', label: 'Zhu Su', note: '3AC Co-founder' },
    { handle: 'KyleLDavies', label: 'Kyle Davies', note: '3AC Co-founder' },
    { handle: 'SBF_FTX', label: 'SBF', note: 'FTX Founder' },
  ],
  investigators: [
    { handle: 'zachxbt', label: 'ZachXBT', note: 'On-chain Sleuth' },
    { handle: 'coffeebreak_YT', label: 'Coffeezilla', note: 'Scam Investigator' },
  ],
  influencers: [
    { handle: 'cobie', label: 'Cobie', note: 'Crypto Analyst' },
    { handle: 'pentosh1', label: 'Pentoshi', note: 'Trader' },
    { handle: 'gainzy222', label: 'Gainzy', note: 'Degen Trader' },
  ]
};

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<'controversial' | 'investigators' | 'influencers'>('controversial');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-12">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-crypto-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full"></div>
        <div className="relative flex items-center bg-gray-900 border border-gray-700 rounded-full shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors">
          <div className="pl-6 text-gray-400">
            <span className="font-mono text-crypto-accent">@</span>
          </div>
          <input
            type="text"
            className="w-full bg-transparent px-2 py-4 text-lg text-white placeholder-gray-500 focus:outline-none font-sans"
            placeholder="Search KOL handle (e.g. pentosh1, ansem)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="mr-2 px-6 py-2 rounded-full bg-crypto-accent text-crypto-dark font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Scanning</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Audit</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 mt-6 mb-4">
        <button
          onClick={() => setActiveCategory('controversial')}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'controversial'
              ? 'bg-red-900/30 text-red-400 border border-red-800'
              : 'bg-gray-800 text-gray-400 hover:text-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Controversial
        </button>
        <button
          onClick={() => setActiveCategory('investigators')}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'investigators'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
              : 'bg-gray-800 text-gray-400 hover:text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Investigators
        </button>
        <button
          onClick={() => setActiveCategory('influencers')}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'influencers'
              ? 'bg-green-900/30 text-green-400 border border-green-800'
              : 'bg-gray-800 text-gray-400 hover:text-gray-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Influencers
        </button>
      </div>

      {/* Suggested Handles */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {SUGGESTED_HANDLES[activeCategory].map(({ handle, label, note }) => (
          <button
            key={handle}
            onClick={() => {
              setInput(handle);
              onSearch(handle);
            }}
            className="group relative bg-gray-900/50 hover:bg-gray-800 border border-gray-700 hover:border-crypto-accent rounded-lg px-4 py-2 transition-all"
            disabled={isLoading}
          >
            <div className="flex flex-col items-start">
              <span className="text-crypto-accent font-medium">@{handle}</span>
              <span className="text-xs text-gray-500 group-hover:text-gray-400">{note}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchInput;