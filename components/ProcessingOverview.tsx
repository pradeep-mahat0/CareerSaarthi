import React from 'react';
import { AgentType, AgentResult, AgentConfig } from '../types';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, Download, Printer } from 'lucide-react';

interface Props {
  results: Record<AgentType, AgentResult>;
  agents: AgentConfig[];
  onSelectAgent: (type: AgentType) => void;
  getIcon: (iconName: string) => React.ReactNode;
  mockInteractionCount: number;
  companyName: string;
}

export const ProcessingOverview: React.FC<Props> = ({ 
    results, 
    agents, 
    onSelectAgent, 
    getIcon, 
    mockInteractionCount,
    companyName 
}) => {
  const completedAgents = (Object.values(results) as AgentResult[]).filter(r => !r.loading && r.content).length;
  const hasAnyContent = completedAgents > 0;

  const handleDownloadMarkdown = () => {
    let content = `# Placement Preparation Report\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    content += `Target Company: ${companyName}\n`;
    content += `This report contains insights from: ${agents.map(a => a.title).join(', ')}\n\n`;
    content += `---\n\n`;

    agents.forEach(agent => {
      const result = results[agent.id];
      if (result && result.content) {
        content += `# ${agent.title}\n\n`;
        content += `${result.content}\n\n`;
        if (result.sources && result.sources.length > 0) {
          content += `\n**Sources:**\n`;
          result.sources.forEach(source => {
            content += `- [${source.title}](${source.uri})\n`;
          });
        }
        content += `\n---\n\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PlacementPrep_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Placement Prep Report - ${companyName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; max-width: 800px; margin: 0 auto; padding: 40px; }
          h1 { color: #4338ca; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px; }
          h2 { color: #3730a3; margin-top: 40px; margin-bottom: 16px; font-size: 1.5em; border-left: 4px solid #4f46e5; padding-left: 12px; }
          h3 { color: #1f2937; margin-top: 24px; font-size: 1.2em; font-weight: 600; }
          .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 40px; font-style: italic; }
          .content { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 0.9em; }
          .agent-section { break-inside: avoid; margin-bottom: 40px; }
          ul, ol { padding-left: 24px; }
          li { margin-bottom: 8px; }
          @media print {
            body { padding: 0; }
            .content { border: none; padding: 0; white-space: pre-wrap; font-family: inherit; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Placement Preparation Report</h1>
        <div class="meta">Target: ${companyName} | Generated on ${new Date().toLocaleDateString()}</div>
        
        ${agents.map(agent => {
          const res = results[agent.id];
          if (!res || !res.content) return '';
          return `
            <div class="agent-section">
              <h2>${agent.title}</h2>
              <div class="content">${res.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `;
        }).join('')}
        
        <script>
          window.onload = () => { setTimeout(() => window.print(), 500); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="h-full overflow-y-auto p-1">
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        
        {/* Export Actions */}
        {hasAnyContent && (
          <div className="flex flex-wrap items-center justify-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm text-sm font-medium"
              >
              <Download className="w-4 h-4" />
              Download Markdown
              </button>
              <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm text-sm font-medium"
              >
              <Printer className="w-4 h-4" />
              Print / Save PDF
              </button>
          </div>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const result = results[agent.id];
            const isDone = !result.loading && result.content;
            const isError = !result.loading && result.error;
            const isLoading = result.loading;

            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`
                  relative group flex items-start gap-4 p-5 rounded-xl border transition-all text-left w-full
                  ${isDone 
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer' 
                    : isLoading 
                      ? 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-indigo-900 shadow-sm ring-1 ring-indigo-50 dark:ring-indigo-900 cursor-pointer'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                <div className={`
                  p-3 rounded-lg shrink-0 transition-colors
                  ${isDone ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}
                  ${isLoading ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400' : ''}
                `}>
                  {getIcon(agent.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold ${isDone || isLoading ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-500'}`}>
                      {agent.title}
                    </h3>
                    {isLoading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    {isDone && <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />}
                    {isError && <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {agent.description}
                  </p>

                  {isDone && (
                    <div className="mt-3 flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      View Results <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  )}
                   {isLoading && (
                    <div className="mt-3 text-xs text-indigo-500 dark:text-indigo-400 animate-pulse">
                      Processing...
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};