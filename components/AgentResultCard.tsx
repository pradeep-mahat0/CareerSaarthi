import React from 'react';
import { AgentResult, AgentType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Loader2, AlertCircle, ExternalLink, RefreshCw, Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  agentType: AgentType;
  result: AgentResult;
  title: string;
  description: string;
  icon: React.ReactNode;
  onRetry: () => void;
}

export const AgentResultCard: React.FC<Props> = ({ agentType, result, title, description, icon, onRetry }) => {
  const isDone = !result.loading && result.content && !result.error;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full transition-all duration-500 ease-in-out">
      {/* Header */}
      <div className={`
        relative p-6 border-b border-gray-100 dark:border-gray-700 
        bg-gradient-to-br from-white via-gray-50 to-indigo-50/30 
        dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/20
        transition-colors duration-300
      `}>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`
              p-3 rounded-xl shadow-sm transition-all duration-300 flex items-center justify-center
              ${result.loading 
                ? 'bg-indigo-50 text-indigo-500 animate-pulse' 
                : isDone 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200 dark:shadow-none' 
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }
            `}>
              {/* Clone icon to apply specific sizing if needed, or wrap */}
              <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            {result.loading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-semibold animate-pulse border border-indigo-100 dark:border-indigo-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            )}
            {isDone && (
               <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-bold px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800 animate-in fade-in zoom-in duration-300">
                 <CheckCircle2 className="w-3.5 h-3.5" />
                 Complete
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto relative bg-white dark:bg-gray-800 scroll-smooth">
        {result.loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
              <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm border border-indigo-100 dark:border-gray-700">
                <Sparkles className="w-8 h-8 text-indigo-500 animate-spin-slow" />
              </div>
            </div>
            <div className="space-y-2 text-center max-w-xs">
              <h4 className="text-gray-900 dark:text-gray-100 font-medium"> Analyzing Data </h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Our AI agents are researching and compiling the best insights for you.
              </p>
            </div>
          </div>
        ) : result.error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4 ring-8 ring-red-50/50 dark:ring-red-900/10">
              <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analysis Interrupted</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md leading-relaxed">
              {result.error}
            </p>

            {result.troubleshooting && result.troubleshooting.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-5 mb-8 text-left w-full max-w-md shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-orange-800 dark:text-orange-300 font-semibold text-sm">
                  <Info className="w-4 h-4" />
                  <span>Try these steps:</span>
                </div>
                <ul className="space-y-2">
                  {result.troubleshooting.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300/80 leading-relaxed">
                      <span className="mt-1 w-1 h-1 bg-orange-400 rounded-full flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 hover:-translate-y-0.5 font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Agent
            </button>
          </div>
        ) : (
          <div className="p-6 md:p-8 animate-in fade-in duration-700">
            <div className="prose prose-indigo dark:prose-invert max-w-none">
                <MarkdownRenderer content={result.content || "No information found."} />
            </div>
            
            {/* Grounding Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                  <ExternalLink className="w-3 h-3" />
                  Verified Sources
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 hover:shadow-sm transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-300 font-bold text-xs group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {idx + 1}
                      </div>
                      <span className="truncate text-xs text-gray-600 dark:text-gray-300 font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                        {source.title}
                      </span>
                      <ExternalLink className="w-3 h-3 ml-auto text-gray-300 dark:text-gray-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};