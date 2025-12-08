import React, { useState, useCallback } from 'react';
import { 
  Building2, 
  FileText, 
  GitBranch, 
  HelpCircle, 
  Briefcase, 
  Sparkles, 
  ArrowRight, 
  Upload,
  CheckCircle2,
  LayoutDashboard,
  MessageSquare,
  Bot
} from 'lucide-react';
import { AgentType, AgentResult, UserInput, AgentConfig } from './types';
import { runAgent } from './services/geminiService';
import { AgentResultCard } from './components/AgentResultCard';
import { ProcessingOverview } from './components/ProcessingOverview';
import { MockInterviewChat } from './components/MockInterviewChat';

const AGENTS: AgentConfig[] = [
  {
    id: AgentType.COMPANY_RESEARCH,
    title: "Company Research",
    description: "Culture, values, and tech stack",
    icon: "Building2"
  },
  {
    id: AgentType.RECRUITMENT_PROCESS,
    title: "Recruitment Process",
    description: "Rounds, pattern, and evaluation",
    icon: "GitBranch"
  },
  {
    id: AgentType.PREVIOUS_QUESTIONS,
    title: "Previous Questions",
    description: "OA, Technical, and HR questions",
    icon: "HelpCircle"
  },
  {
    id: AgentType.RESUME_OPTIMIZATION,
    title: "Resume Optimizer",
    description: "ATS analysis and improvements",
    icon: "FileText"
  },
  {
    id: AgentType.HR_ANSWER_GENERATION,
    title: "HR Answer Generator",
    description: "Tailored answers for HR rounds",
    icon: "MessageSquare"
  },
  {
    id: AgentType.MOCK_INTERVIEWER,
    title: "Mock Interviewer",
    description: "Live practice with AI coach",
    icon: "Bot"
  }
];

const INITIAL_RESULTS: Record<AgentType, AgentResult> = {
  [AgentType.COMPANY_RESEARCH]: { type: AgentType.COMPANY_RESEARCH, loading: false },
  [AgentType.RESUME_OPTIMIZATION]: { type: AgentType.RESUME_OPTIMIZATION, loading: false },
  [AgentType.RECRUITMENT_PROCESS]: { type: AgentType.RECRUITMENT_PROCESS, loading: false },
  [AgentType.PREVIOUS_QUESTIONS]: { type: AgentType.PREVIOUS_QUESTIONS, loading: false },
  [AgentType.HR_ANSWER_GENERATION]: { type: AgentType.HR_ANSWER_GENERATION, loading: false },
  [AgentType.MOCK_INTERVIEWER]: { type: AgentType.MOCK_INTERVIEWER, loading: false, content: "Ready" },
};

function App() {
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [input, setInput] = useState<UserInput>({
    companyName: '',
    jobRole: '',
    jobDescription: '',
    resumeContent: ''
  });
  const [results, setResults] = useState<Record<AgentType, AgentResult>>(INITIAL_RESULTS);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mockInteractionCount, setMockInteractionCount] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple text reading
    const text = await file.text();
    setInput(prev => ({ ...prev, resumeContent: text }));
  };

  const startAnalysis = useCallback(() => {
    if (!input.companyName || !input.jobRole) return;

    setStep('results');
    setActiveTab('overview');
    setMockInteractionCount(0); // Reset interaction count on new analysis
    
    // Trigger all agents except Mock Interviewer (which is interactive)
    Object.values(AgentType).forEach(type => {
      if (type === AgentType.MOCK_INTERVIEWER) {
          setResults(prev => ({
              ...prev,
              [type]: { ...prev[type], loading: false, content: "Ready to start" }
          }));
          return;
      }

      setResults(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: true, error: undefined }
      }));

      runAgent(type, input).then(partialResult => {
        setResults(prev => ({
          ...prev,
          [type]: { ...prev[type], ...partialResult, loading: false }
        }));
      });
    });
  }, [input]);

  const retryAgent = (type: AgentType) => {
    setResults(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: undefined }
    }));
    runAgent(type, input).then(partialResult => {
      setResults(prev => ({
        ...prev,
        [type]: { ...prev[type], ...partialResult, loading: false }
      }));
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 className="w-5 h-5" />;
      case 'FileText': return <FileText className="w-5 h-5" />;
      case 'GitBranch': return <GitBranch className="w-5 h-5" />;
      case 'HelpCircle': return <HelpCircle className="w-5 h-5" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5" />;
      case 'Bot': return <Bot className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                PlacementPrep.AI
              </span>
            </div>
            {step === 'results' && (
              <button 
                onClick={() => setStep('input')}
                className="self-center text-sm font-medium text-gray-500 hover:text-indigo-600"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow bg-gray-50/50">
        {step === 'input' ? (
          <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
                Master Your <span className="text-indigo-600">Dream Job</span> Interview
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Deploy specialized AI agents to research the company, decode the recruitment process, find past questions, optimize your resume, and practice with a live mock interviewer.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-8 md:p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Target Company <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="companyName"
                        value={input.companyName}
                        onChange={handleInputChange}
                        placeholder="e.g. Google, Goldman Sachs, TCS"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Job Role <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="jobRole"
                        value={input.jobRole}
                        onChange={handleInputChange}
                        placeholder="e.g. Software Engineer, Data Analyst"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Job Description (Optional)</label>
                  <textarea
                    name="jobDescription"
                    value={input.jobDescription}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Paste the job description here for better resume tailoring and HR answer generation..."
                    className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Your Resume (Optional)</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                       <textarea
                        name="resumeContent"
                        value={input.resumeContent}
                        onChange={handleInputChange}
                        rows={6}
                        placeholder="Paste your resume text here..."
                        className="block w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-mono bg-gray-50"
                      />
                      {input.resumeContent && (
                        <div className="absolute top-2 right-2 text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Content Loaded
                        </div>
                      )}
                    </div>
                    
                    <div className="flex md:flex-col items-center justify-center gap-3 md:w-48">
                      <div className="w-full h-px bg-gray-200 md:hidden"></div>
                      <span className="text-gray-400 text-sm font-medium whitespace-nowrap">OR</span>
                      <div className="w-full h-px bg-gray-200 md:hidden"></div>
                      
                      <label className="w-full flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-center">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2" />
                        <span className="text-sm text-gray-600 font-medium">Upload .txt/.md</span>
                        <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startAnalysis}
                  disabled={!input.companyName || !input.jobRole}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.01]"
                >
                  Deploy Agents <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-64px)] flex overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-200 h-full flex-shrink-0">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Target</h2>
                <div className="font-bold text-gray-800 text-lg truncate">{input.companyName}</div>
                <div className="text-gray-500 text-sm truncate">{input.jobRole}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {/* Overview Button */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    activeTab === 'overview'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`${activeTab === 'overview' ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-sm">Mission Control</div>
                </button>

                <div className="my-2 border-t border-gray-100"></div>

                {AGENTS.map(agent => {
                  const result = results[agent.id];
                  const isDone = !result.loading && result.content;
                  // Special check for Mock Interviewer since it's always "ready" once started
                  const isReadyMock = agent.id === AgentType.MOCK_INTERVIEWER && result.content === "Ready to start";
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setActiveTab(agent.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        activeTab === agent.id
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className={`${activeTab === agent.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {getIcon(agent.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{agent.title}</div>
                        <div className="text-xs opacity-80 truncate">{agent.description}</div>
                      </div>
                      {result.loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-500 shrink-0" />}
                      {(isDone || isReadyMock) && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Mobile Tabs */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-2 py-2 flex justify-between overflow-x-auto hide-scrollbar">
               <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex flex-col items-center justify-center p-2 min-w-[70px] rounded-lg ${
                    activeTab === 'overview' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1 text-center leading-tight">Overview</span>
                </button>
               {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setActiveTab(agent.id)}
                    className={`flex flex-col items-center justify-center p-2 min-w-[70px] rounded-lg ${
                      activeTab === agent.id ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'
                    }`}
                  >
                    {getIcon(agent.icon)}
                    <span className="text-[10px] font-medium mt-1 text-center leading-tight">{agent.title.split(' ')[0]}</span>
                  </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-gray-50/50 p-4 md:p-8 mb-16 md:mb-0">
               <div className="max-w-5xl mx-auto h-full">
                  {activeTab === 'overview' ? (
                    <ProcessingOverview 
                      results={results} 
                      agents={AGENTS} 
                      onSelectAgent={(id) => setActiveTab(id)}
                      getIcon={getIcon}
                      mockInteractionCount={mockInteractionCount}
                      companyName={input.companyName}
                    />
                  ) : activeTab === AgentType.MOCK_INTERVIEWER ? (
                    <MockInterviewChat 
                        input={input} 
                        previousQuestionsContext={results[AgentType.PREVIOUS_QUESTIONS].content}
                        onInteraction={() => setMockInteractionCount(c => c + 1)}
                    />
                  ) : (
                    <AgentResultCard
                      agentType={activeTab as AgentType}
                      result={results[activeTab as AgentType]}
                      title={AGENTS.find(a => a.id === activeTab)?.title || ''}
                      description={AGENTS.find(a => a.id === activeTab)?.description || ''}
                      icon={getIcon(AGENTS.find(a => a.id === activeTab)?.icon || '')}
                      onRetry={() => retryAgent(activeTab as AgentType)}
                    />
                  )}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Simple loader component for local usage if needed, though Lucide provides one.
function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default App;