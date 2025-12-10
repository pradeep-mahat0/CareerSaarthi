import React from 'react';
import { AgentType, AgentResult } from '../types';
import { Trophy, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  results: Record<AgentType, AgentResult>;
  mockInteractionCount: number;
  companyName: string;
}

export const ReadinessScore: React.FC<Props> = ({ results, mockInteractionCount, companyName }) => {
  // Scoring Rules
  const RULES = [
    { 
      id: 'resume', 
      label: 'Resume Optimized', 
      points: 20, 
      check: () => !!results[AgentType.RESUME_OPTIMIZATION].content && !results[AgentType.RESUME_OPTIMIZATION].loading 
    },
    { 
      id: 'research', 
      label: 'Company Research', 
      points: 10, 
      check: () => !!results[AgentType.COMPANY_RESEARCH].content && !results[AgentType.COMPANY_RESEARCH].loading 
    },
    { 
      id: 'process', 
      label: 'Recruitment Process Known', 
      points: 15, 
      check: () => !!results[AgentType.RECRUITMENT_PROCESS].content && !results[AgentType.RECRUITMENT_PROCESS].loading 
    },
    { 
      id: 'questions', 
      label: 'Previous Questions Analyzed', 
      points: 15, 
      check: () => !!results[AgentType.PREVIOUS_QUESTIONS].content && !results[AgentType.PREVIOUS_QUESTIONS].loading 
    },
    { 
      id: 'hr', 
      label: 'HR Strategy Prepared', 
      points: 10, 
      check: () => !!results[AgentType.HR_ANSWER_GENERATION].content && !results[AgentType.HR_ANSWER_GENERATION].loading 
    },
    { 
      id: 'mock', 
      label: 'Mock Interview Practice', 
      points: 30, // 10 points per question up to 30
      currentPoints: () => Math.min(mockInteractionCount * 10, 30),
      check: () => mockInteractionCount >= 3,
      isPartial: true
    }
  ];

  const totalScore = RULES.reduce((acc, rule) => {
    if (rule.isPartial && rule.currentPoints) {
      return acc + rule.currentPoints();
    }
    return acc + (rule.check() ? rule.points : 0);
  }, 0);

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-indigo-600 dark:text-indigo-400';
    return 'text-amber-500 dark:text-amber-400';
  };

  // Generate Suggestion
  const getSuggestion = () => {
    const missing = RULES.find(r => !r.check());
    if (!missing) return "You are fully prepared! Go smash that interview!";
    
    if (missing.id === 'mock') {
      const remaining = 3 - mockInteractionCount;
      return `Practice ${remaining} more mock interview answer${remaining > 1 ? 's' : ''} to reach 100% readiness.`;
    }
    
    if (missing.id === 'resume') return "Wait for the Resume Optimizer to finish to boost your score.";
    
    return `Review the ${missing.label} insights to improve your score.`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Trophy className="w-32 h-32 dark:text-white" />
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
        
        {/* Score Circle */}
        <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
                <circle
                    className="text-gray-100 dark:text-gray-700"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                />
                <circle
                    className={`${totalScore >= 80 ? 'text-green-500 dark:text-green-400' : totalScore >= 50 ? 'text-indigo-500 dark:text-indigo-400' : 'text-amber-500 dark:text-amber-400'} transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={365}
                    strokeDashoffset={365 - (365 * totalScore) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-3xl font-bold ${getProgressColor(totalScore)}`}>{totalScore}%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Ready</span>
            </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 w-full text-center md:text-left">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                Placement Readiness for <span className="text-indigo-600 dark:text-indigo-400">{companyName}</span>
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {getSuggestion()}
            </p>

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {RULES.map(rule => {
                    const isCompleted = rule.check();
                    return (
                        <div key={rule.id} className="flex items-center gap-2">
                             {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0" />
                             ) : (
                                <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                             )}
                             <span className={`${isCompleted ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                {rule.label}
                             </span>
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  );
};