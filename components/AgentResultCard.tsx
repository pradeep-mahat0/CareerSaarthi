import React from 'react';
import { AgentResult, AgentType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Loader2, AlertCircle, ExternalLink, RefreshCw, Info } from 'lucide-react';

interface Props {
  agentType: AgentType;
  result: AgentResult;
  title: string;
  description: string;
  icon: React.ReactNode;
  onRetry: () => void;
}

export const AgentResultCard: React.FC<Props> = ({ agentType, result, title, description, icon, onRetry }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {result.loading && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-grow min-h-[400px] max-h-[800px] text-gray-800">
        {result.loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-60">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <p className="text-gray-400 text-sm">Our agent is gathering intelligence...</p>
          </div>
        ) : result.error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="bg-red-50 p-4 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Analysis Failed</h4>
            <p className="text-gray-500 mb-6 max-w-md">{result.error}</p>

            {result.troubleshooting && result.troubleshooting.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-8 text-left w-full max-w-md">
                <div className="flex items-center gap-2 mb-2 text-orange-700 font-medium text-sm">
                  <Info className="w-4 h-4" />
                  <span>Troubleshooting Suggestions</span>
                </div>
                <ul className="list-disc pl-5 space-y-1.5">
                  {result.troubleshooting.map((step, idx) => (
                    <li key={idx} className="text-xs text-orange-800/80 leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Agent
            </button>
          </div>
        ) : (
          <div>
            <MarkdownRenderer content={result.content || "No information found."} />
            
            {/* Grounding Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Sources & References
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-xs text-gray-600 hover:text-indigo-700 transition-colors group"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-indigo-500" />
                      <span className="truncate">{source.title}</span>
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