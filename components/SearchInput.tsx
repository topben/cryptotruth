import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchInputProps {
  onSearch: (handle: string) => void;
  isLoading: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading }) => {
  const [input, setInput] = useState('');

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
      <div className="text-center mt-4 text-sm text-gray-500">
        <span className="mr-4">Top Searches:</span>
        {['@cobie', '@zhusu', '@zachxbt'].map(handle => (
            <button 
                key={handle} 
                onClick={() => { setInput(handle.replace('@','')); onSearch(handle.replace('@','')); }}
                className="text-crypto-muted hover:text-crypto-accent mx-2 underline decoration-dotted"
            >
                {handle}
            </button>
        ))}
      </div>
    </div>
  );
};

export default SearchInput;