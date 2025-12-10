import React, { useState, useEffect } from 'react';
import { UserInput, QuizQuestion, ResumeGrade } from '../types';
import { generateGameQuiz, generateResumeGrade, getImportantQuestionsList } from '../services/geminiService';
import { MockInterviewChat } from './MockInterviewChat';
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, RefreshCw, Star, Medal, AlertTriangle, Upload, ArrowLeft, FileText, Bot } from 'lucide-react';

interface Props {
  input: UserInput;
  onExit: () => void;
  previousQuestionsContext?: string;
}

export const GameMode: React.FC<Props> = ({ input, onExit, previousQuestionsContext }) => {
  const [level, setLevel] = useState<number>(0); // 0=Intro, 5=Summary
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Level 1: Quiz Data
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState(0);

  // Level 2: Resume Data
  const [resumeGrade, setResumeGrade] = useState<ResumeGrade | null>(null);
  const [currentResume, setCurrentResume] = useState(input.resumeContent || "");

  // Level 3: Checklist Data
  const [checklistQuestions, setChecklistQuestions] = useState<string[]>([]);
  const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>([]);

  // Level 4: Mock Data
  const [mockInteractions, setMockInteractions] = useState(0);

  // --- Handlers ---

  const startLevel1 = async () => {
    setLoading(true);
    setError(null);
    try {
        const qs = await generateGameQuiz(input);
        if (!qs || qs.length === 0) {
            throw new Error("Failed to generate quiz questions. Please try again.");
        }
        setQuizQuestions(qs);
        setQuizAnswers(new Array(qs.length).fill(-1));
        setLevel(1);
    } catch (e) {
        setError("Could not load the quiz. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleQuizAnswer = (qIndex: number, optionIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[qIndex] = optionIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) score++;
    });
    setQuizScore(score);
    setLevel(0); // Back to Menu
  };

  const handleFileUploadInGame = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || 
        file.type === "application/msword" || 
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        alert("Document parsing is limited in this demo. For best results with PDF/Docs, please copy-paste the text if the auto-extraction looks incorrect.");
    }

    try {
        const text = await file.text();
        setCurrentResume(text);
    } catch (err) {
        console.error("Failed to read file", err);
        setError("Could not read file.");
    }
  };

  const startResumeAnalysis = async () => {
    if (!currentResume.trim()) {
        setError("Please enter your resume content before analyzing.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const grade = await generateResumeGrade({ ...input, resumeContent: currentResume });
        if (!grade) throw new Error("Analysis failed");
        setResumeGrade(grade);
    } catch (e) {
        setError("Could not analyze resume. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const startLevel3 = async () => {
    if (checklistQuestions.length > 0) {
        setLevel(3);
        return;
    }

    setLoading(true);
    setError(null);
    try {
        const qs = await getImportantQuestionsList(input);
        if (!qs || qs.length === 0) {
            throw new Error("Failed to retrieve important questions.");
        }
        setChecklistQuestions(qs);
        setCheckedQuestions(new Array(qs.length).fill(false));
        setLevel(3);
    } catch (e) {
         setError("Could not load revision questions. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const startLevel4 = () => {
    setLevel(4);
  };

  // Scores
  const wQuiz = Math.round((quizScore / Math.max(quizQuestions.length, 1)) * 20);
  const wResume = Math.round((resumeGrade?.score || 0) * 0.2); // 100 * 0.2 = 20
  const wChecklist = Math.round((checkedQuestions.filter(b => b).length / Math.max(checklistQuestions.length, 1)) * 20);
  const wMock = Math.min(mockInteractions * 10, 40); // 4 interactions = 40 pts

  const totalGameScore = wQuiz + wResume + wChecklist + wMock;

  // --- Renderers ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center animate-in fade-in duration-300">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Generating Challenge...</h2>
        <p className="text-gray-500 dark:text-gray-400">Consulting AI agents for {input.companyName}...</p>
      </div>
    );
  }

  // Generic Error State
  if (error && !resumeGrade && level !== 2) { 
      return (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Something went wrong</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
              <button 
                  onClick={() => {
                      if (level === 0) startLevel1(); 
                      if (level === 1) startLevel1(); 
                      if (level === 3) startLevel3(); 
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
              >
                  <RefreshCw className="w-4 h-4" /> Try Again
              </button>
               <button 
                  onClick={() => setLevel(0)}
                  className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline block mx-auto"
              >
                  Back to Menu
              </button>
          </div>
      )
  }

  // Level 0: Intro / Menu
  if (level === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex flex-col items-center min-h-full max-w-5xl mx-auto text-center space-y-10 animate-in fade-in zoom-in duration-300 p-6 md:p-12">
          
          {/* Header Section */}
          <div className="space-y-4 relative z-10">
             <div className="relative inline-block mb-2">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-6 rounded-full shadow-sm">
                    <Trophy className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                </div>
                 {totalGameScore > 0 && (
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full border-4 border-white dark:border-gray-800 shadow-lg">
                        {totalGameScore}%
                    </div>
                )}
             </div>

             <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Placement Readiness Game</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-3 leading-relaxed">
                    Are you truly ready for <span className="font-bold text-indigo-600 dark:text-indigo-400">{input.companyName}</span>? 
                    Complete 4 levels to prove your skills and earn your readiness badge.
                </p>
             </div>
          </div>

          {/* Levels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left max-w-4xl relative z-10">
              {/* Level 1 */}
              <button 
                onClick={startLevel1} 
                className="group relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg transition-all text-left flex flex-col h-full"
              >
                  <div className="absolute top-4 right-4 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded border border-amber-100 dark:border-amber-800">
                      {wQuiz}/20 Pts
                  </div>
                  <div className="mb-4">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Star className="w-6 h-6 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                      </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Level 1</h3>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Company Knowledge Quiz</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Test your research on values, mission & products.</p>
                  </div>
              </button>

              {/* Level 2 */}
              <button 
                onClick={() => setLevel(2)} 
                className="group relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all text-left flex flex-col h-full"
              >
                  <div className="absolute top-4 right-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                      {wResume}/20 Pts
                  </div>
                  <div className="mb-4">
                       <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                      </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Level 2</h3>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Resume Analysis Challenge</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Get your resume graded against the job description.</p>
                  </div>
              </button>

              {/* Level 3 */}
              <button 
                onClick={startLevel3} 
                className="group relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-green-400 dark:hover:border-green-600 hover:shadow-lg transition-all text-left flex flex-col h-full"
              >
                   <div className="absolute top-4 right-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded border border-green-100 dark:border-green-800">
                      {wChecklist}/20 Pts
                  </div>
                  <div className="mb-4">
                       <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Level 3</h3>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Vital Questions Checklist</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Review the must-know questions for this role.</p>
                  </div>
              </button>

              {/* Level 4 */}
              <button 
                onClick={() => setLevel(4)} 
                className="group relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all text-left flex flex-col h-full"
              >
                   <div className="absolute top-4 right-4 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                      {wMock}/40 Pts
                  </div>
                  <div className="mb-4">
                       <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Level 4</h3>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Mock Interview Simulation</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Practice real-time answers with AI coach.</p>
                  </div>
              </button>
          </div>
        </div>
      </div>
    );
  }

  // Level 1: Quiz
  if (level === 1) {
    return (
      <div className="h-full flex flex-col max-w-3xl mx-auto p-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 shrink-0 mb-4">
            <button onClick={() => setLevel(0)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors" title="Back to Menu">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Level 1: Company Quiz</h2>
                <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-bold">20 Pts</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {quizQuestions.map((q, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{idx + 1}. {q.question}</h3>
                    <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                            <button
                                key={optIdx}
                                onClick={() => handleQuizAnswer(idx, optIdx)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    quizAnswers[idx] === optIdx 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="pt-4 shrink-0">
            <button
                onClick={submitQuiz}
                disabled={quizAnswers.includes(-1)}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
                Submit & Finish Quiz
            </button>
        </div>
      </div>
    );
  }

  // Level 2: Resume
  if (level === 2) {
    return (
      <div className="h-full flex flex-col max-w-3xl mx-auto p-4 animate-in slide-in-from-right duration-300">
         {/* Header */}
         <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 shrink-0 mb-4">
            <button onClick={() => setLevel(0)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors" title="Back to Menu">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Level 2: Resume Check</h2>
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold border ${resumeGrade ? (resumeGrade.score >= 70 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800') : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>
                        Score: {resumeGrade?.score || 0}/100
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-bold">20 Pts</span>
                </div>
            </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Reviewing for {input.jobRole}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Paste your latest resume below or upload a file.
                </p>

                <div className="mb-4">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 mb-1" />
                            <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> (PDF, TXT, DOCX)</p>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.doc,.docx,.txt,.md" 
                            onChange={handleFileUploadInGame} 
                        />
                    </label>
                </div>

                <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">OR Paste Text</span>
                    </div>
                </div>

                <textarea
                    value={currentResume}
                    onChange={(e) => setCurrentResume(e.target.value)}
                    rows={8}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    placeholder="Paste your resume text here..."
                />
                
                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                {resumeGrade && (
                    <div className="space-y-4 animate-in fade-in mt-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`text-4xl font-bold ${resumeGrade.score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                                    {resumeGrade.score}/100
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Resume Match Score</div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1">Feedback:</h4>
                                    <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        {resumeGrade.feedback.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>
                                {resumeGrade.missingKeywords.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-1">Missing Keywords:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {resumeGrade.missingKeywords.map((k, i) => (
                                                <span key={i} className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs rounded-md border border-red-100 dark:border-red-800">
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="pt-4 shrink-0">
             {resumeGrade ? (
                <div className="flex gap-3">
                    <button 
                        onClick={startResumeAnalysis} 
                        className="flex-1 py-3 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors"
                    >
                        Improve & Re-evaluate
                    </button>
                    <button
                        onClick={() => setLevel(0)}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md"
                    >
                        Save Score & Menu
                    </button>
                </div>
             ) : (
                <button
                    onClick={startResumeAnalysis}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md"
                >
                    Analyze Resume
                </button>
             )}
        </div>
      </div>
    );
  }

  // Level 3: Checklist
  if (level === 3) {
    return (
      <div className="h-full flex flex-col max-w-3xl mx-auto p-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4 shrink-0 mb-4">
             <button onClick={() => setLevel(0)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors" title="Back to Menu">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Level 3: Revision</h2>
                <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold">20 Pts</span>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg text-indigo-800 dark:text-indigo-300 text-sm">
                Review these frequently asked questions. Mark the ones you are confident you can answer perfectly.
            </div>

            <div className="space-y-2">
                {checklistQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => {
                                const newChecked = [...checkedQuestions];
                                newChecked[idx] = !newChecked[idx];
                                setCheckedQuestions(newChecked);
                            }}>
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${checkedQuestions[idx] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                            {checkedQuestions[idx] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm select-none ${checkedQuestions[idx] ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{q}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="pt-4 shrink-0">
            <button
                onClick={() => setLevel(0)}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md"
            >
                Save Progress & Menu
            </button>
        </div>
      </div>
    );
  }

  // Level 4: Mock
  if (level === 4) {
    const remaining = 4 - mockInteractions;
    const isGoalMet = remaining <= 0;
    
    return (
      <div className="h-full flex flex-col max-w-4xl mx-auto p-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 mb-4 shrink-0">
             <button onClick={() => setLevel(0)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors" title="Back to Menu">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Level 4: Interview</h2>
                 <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {isGoalMet ? 'Goal Reached!' : `Complete ${remaining} more interactions`}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-sm font-bold">40 Pts</span>
                 </div>
            </div>
        </div>

        <div className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800">
             <MockInterviewChat 
                input={input} 
                onInteraction={() => setMockInteractions(c => c + 1)}
                previousQuestionsContext={previousQuestionsContext}
             />
        </div>

        <div className="mt-4 shrink-0">
            <button
                onClick={() => setLevel(0)}
                disabled={mockInteractions < 1} // At least try once
                className={`w-full py-4 font-bold rounded-xl shadow-md transition-all ${
                    mockInteractions >= 4 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : mockInteractions >= 1 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
                {mockInteractions >= 4 ? 'Finish Game & Menu' : 'Finish Early & Menu'}
            </button>
        </div>
      </div>
    );
  }

  return null;
};