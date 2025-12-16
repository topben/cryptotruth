import React from 'react';
import { useTranslation } from 'react-i18next';
import { HistoryEvent } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ events }) => {
  const { t } = useTranslation();

  if (!events || events.length === 0) {
    return <div className="text-gray-500 italic text-center py-8">{t('timeline.noEvents')}</div>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'PREDICTION_WIN':
        return <CheckCircle2 className="w-6 h-6 text-crypto-success" />;
      case 'PREDICTION_LOSS':
        return <XCircle className="w-6 h-6 text-crypto-danger" />;
      case 'CONTROVERSY':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-400" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'PREDICTION_WIN': return 'border-l-crypto-success';
      case 'PREDICTION_LOSS': return 'border-l-crypto-danger';
      case 'CONTROVERSY': return 'border-l-orange-500';
      default: return 'border-l-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-display font-semibold text-white mb-4">{t('timeline.title')}</h3>
      <div className="relative border-l-2 border-gray-800 ml-3 space-y-6 pl-6 py-2">
        {events.map((event, idx) => (
          <div key={idx} className={`relative bg-gray-900/50 p-4 rounded-r-lg border-l-4 ${getBorderColor(event.type)} hover:bg-gray-800 transition-colors`}>
            {/* Timeline Dot */}
            <div className="absolute -left-[35px] top-4 bg-crypto-dark rounded-full p-1 border border-gray-700">
                {getIcon(event.type)}
            </div>

            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2 flex-1">
                <h4 className="font-bold text-white text-lg">{event.description}</h4>
                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-crypto-accent hover:text-blue-400 transition-colors"
                    title={t('timeline.viewSource')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">{event.date}</span>
            </div>

            {event.token && (
              <span className="inline-block bg-blue-900/30 text-blue-400 text-xs px-2 py-0.5 rounded mb-2">
                ${event.token}
              </span>
            )}

            <p className="text-gray-400 text-sm leading-relaxed">
              {event.details}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryTimeline;
