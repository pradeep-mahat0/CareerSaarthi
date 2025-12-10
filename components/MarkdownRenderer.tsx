import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  return (
    <div className="prose prose-indigo dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-strong:text-indigo-900 dark:prose-strong:text-indigo-300">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 border-b dark:border-gray-700 pb-2 text-indigo-900 dark:text-indigo-300" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-indigo-800 dark:text-indigo-400" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
          li: ({node, ...props}) => <li className="pl-1 text-gray-700 dark:text-gray-300" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
          code: ({node, ...props}) => <code className="bg-gray-100 dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
          pre: ({node, ...props}) => <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-400 pl-4 italic bg-indigo-50 dark:bg-indigo-900/30 py-2 rounded-r my-4 text-gray-700 dark:text-gray-300" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};