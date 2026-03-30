import React from 'react';
import { ExternalLink, Flag, ShieldCheck } from 'lucide-react';
import { Language, OfficialRouteResolution, PrimaryAction } from '../types';

interface PrimaryActionsProps {
  actions: PrimaryAction[];
  officialRoute: OfficialRouteResolution;
  language?: Language;
  onReport?: () => void;
}

const LABELS = {
  en: {
    official: 'Go to the correct official entry',
    report: 'Report this suspicious content now',
  },
  'zh-TW': {
    official: '改走正確官方入口',
    report: '立即回報這則可疑內容',
  },
  vi: {
    official: 'Đi theo lối vào chính thức',
    report: 'Báo cáo nội dung đáng ngờ ngay',
  },
};

const PrimaryActions: React.FC<PrimaryActionsProps> = ({ actions, officialRoute, language = 'zh-TW', onReport }) => {
  const t = LABELS[language];
  const officialAction = actions.find((item) => item.kind === 'OFFICIAL_ROUTE') ?? {
    label: t.official,
    kind: 'OFFICIAL_ROUTE',
    emphasis: officialRoute.status === 'OFFICIAL_UNKNOWN' ? 'disabled' : 'primary',
    actionUrl: officialRoute.url,
    description: officialRoute.rationale,
  };
  const reportAction = actions.find((item) => item.kind === 'REPORT') ?? {
    label: t.report,
    kind: 'REPORT',
    emphasis: 'secondary',
    actionUrl: 'https://165.npa.gov.tw/#/report/call/02',
    description: '',
  };

  const buttonClass = (emphasis: PrimaryAction['emphasis']) => {
    if (emphasis === 'disabled') {
      return 'cursor-not-allowed border-gray-700 bg-gray-900 text-gray-500';
    }
    if (emphasis === 'secondary') {
      return 'border-amber-700/50 bg-amber-950/30 text-amber-100 hover:bg-amber-900/40';
    }
    return 'border-cyan-700/50 bg-cyan-400 text-black hover:bg-cyan-300';
  };

  return (
    <section className="mb-5 grid gap-3 md:grid-cols-2">
      {[officialAction, reportAction].map((action) => {
        const isDisabled = action.emphasis === 'disabled' || (!action.actionUrl && action.kind !== 'REPORT');
        const icon = action.kind === 'REPORT'
          ? <Flag className="w-5 h-5" />
          : <ShieldCheck className="w-5 h-5" />;

        const content = (
          <div className={`rounded-2xl border p-4 transition-colors ${buttonClass(action.emphasis)}`}>
            <div className="mb-2 flex items-center gap-2 font-semibold">
              {icon}
              <span>{action.label}</span>
              {!isDisabled && <ExternalLink className="ml-auto w-4 h-4 opacity-70" />}
            </div>
            <p className="text-sm opacity-80">{action.description}</p>
          </div>
        );

        // REPORT: use the modal callback when provided
        if (action.kind === 'REPORT' && onReport) {
          return (
            <button key={action.kind} onClick={onReport} className="text-left w-full">
              {content}
            </button>
          );
        }

        if (isDisabled) {
          return <div key={action.kind}>{content}</div>;
        }

        return (
          <a key={action.kind} href={action.actionUrl} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        );
      })}
    </section>
  );
};

export default PrimaryActions;
