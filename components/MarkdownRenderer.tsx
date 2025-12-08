import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  return (
    <div className="prose prose-indigo max-w-none prose-headings:font-bold prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-indigo-900">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 border-b pb-2 text-indigo-900" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-6 mb-3 text-indigo-800" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-700" {...props} />,
          li: ({node, ...props}) => <li className="pl-1 text-gray-700" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-700" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
          code: ({node, ...props}) => <code className="bg-gray-100 text-indigo-600 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
          pre: ({node, ...props}) => <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-400 pl-4 italic bg-indigo-50 py-2 rounded-r my-4 text-gray-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};