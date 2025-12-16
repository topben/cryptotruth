import React from 'react';
import { useTranslation } from 'react-i18next';

interface TrustMeterProps {
  score: number;
}

const TrustMeter: React.FC<TrustMeterProps> = ({ score }) => {
  const { t } = useTranslation();

  // Color calculation based on score
  const getColor = (val: number) => {
    if (val >= 80) return 'text-crypto-success border-crypto-success shadow-crypto-success/50';
    if (val >= 50) return 'text-yellow-400 border-yellow-400 shadow-yellow-400/50';
    return 'text-crypto-danger border-crypto-danger shadow-crypto-danger/50';
  };

  const getLabel = (val: number) => {
    if (val >= 90) return t('trustScore.legend');
    if (val >= 75) return t('trustScore.trusted');
    if (val >= 50) return t('trustScore.mixed');
    if (val >= 30) return t('trustScore.risky');
    return t('trustScore.scammer');
  };

  const colorClass = getColor(score);

  // Increased radius to fill the 160px box better (was 45)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-crypto-card rounded-2xl shadow-xl border border-gray-800 h-full w-full">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="absolute w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-gray-800 opacity-40"
          />
          {/* Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${colorClass.split(' ')[0]}`}
          />
        </svg>
        <div className="flex flex-col items-center z-10">
            <span className={`text-5xl font-display font-bold ${colorClass.split(' ')[0]} drop-shadow-sm`}>
                {score}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-semibold">{t('trustScore.label')}</span>
        </div>
      </div>
      <div className={`mt-6 px-6 py-2 rounded-full border ${colorClass} bg-opacity-10 font-bold tracking-widest text-sm shadow-lg`}>
        {getLabel(score)}
      </div>
    </div>
  );
};

export default TrustMeter;
