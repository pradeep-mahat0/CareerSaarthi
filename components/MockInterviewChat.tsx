import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { createChatSession, transcribeAudio, generateSpeech } from '../services/geminiService';
import { UserInput, ChatMessage } from '../types';
import { Send, Mic, Loader2, Volume2, User, Bot, StopCircle, XCircle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  input: UserInput;
  previousQuestionsContext?: string;
  onInteraction?: () => void;
}

export const MockInterviewChat: React.FC<Props> = ({ input, previousQuestionsContext, onInteraction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<number | null>(null); // Index of message playing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      try {
        const chat = createChatSession(input, previousQuestionsContext);
        setChatSession(chat);
        
        // Start the interview with an initial prompt to the model to begin
        const response = await chat.sendMessage({ message: "Start the interview." });
        const text = response.text;
        
        setMessages([{ role: 'model', text: text || "Hello, I am ready to interview you." }]);
      } catch (error) {
        console.error("Failed to start chat", error);
        setMessages([{ role: 'model', text: "I'm having trouble connecting. Please check your API key or internet." }]);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [input, previousQuestionsContext]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || !chatSession || loading || sessionEnded) return;

    const userMsg: ChatMessage = { role: 'user', text: currentInput };
    setMessages(prev => [...prev, userMsg]);
    setCurrentInput('');
    setLoading(true);

    // Trigger score update
    if (onInteraction) {
        onInteraction();
    }

    try {
      const response = await chatSession.sendMessage({ message: currentInput });
      const text = response.text || "I didn't catch that.";
      
      const modelMsg: ChatMessage = { role: 'model', text: text };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const endSession = () => {
      if (isRecording) stopRecording();
      if (audioRef.current) audioRef.current.pause();
      
      setSessionEnded(true);
      setMessages(prev => [...prev, { role: 'model', text: "**Interview Session Ended.** \n\nGood job practicing! Review your answers above or start a new analysis to try again." }]);
  };

  // Audio Recording Logic
  const startRecording = async () => {
    if (sessionEnded) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording is not supported in this browser.");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome uses webm
        setIsRecording(false);
        setLoading(true);
        try {
            const transcription = await transcribeAudio(audioBlob);
            setCurrentInput(prev => prev + (prev ? ' ' : '') + transcription);
        } catch (err: any) {
            console.error("Transcription failed", err);
            let errorMsg = "Could not transcribe audio.";
            if (err.message?.includes("API key")) errorMsg = "Transcription failed: Check API Key.";
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Could not access microphone", err);
      let errorMsg = "Microphone access failed.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = "Microphone permission denied. Please allow access in your browser settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "No microphone found. Please connect a microphone.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = "Microphone is busy or not readable. Check if another app is using it.";
      }
      
      alert(errorMsg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // TTS Logic
  const playMessage = async (text: string, index: number) => {
    if (isPlaying === index && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(null);
        return;
    }

    try {
        // If we are playing something else, stop it
        if (audioRef.current) {
            audioRef.current.pause();
        }

        // Check if audioUrl is already cached in the message
        const existingMsg = messages[index];
        let audioUrl = existingMsg.audioUrl;

        if (!audioUrl) {
            audioUrl = await generateSpeech(text);
            // Update message with audioUrl to cache it locally
            const newMessages = [...messages];
            newMessages[index] = { ...existingMsg, audioUrl };
            setMessages(newMessages);
        }

        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(null);
        audio.play();
        audioRef.current = audio;
        setIsPlaying(index);

    } catch (e: any) {
        console.error("TTS Failed", e);
        let errorMsg = "Could not generate audio.";
        const errStr = e.message || String(e);
        if (errStr.includes("API key")) errorMsg = "TTS failed: Invalid API Key.";
        else if (errStr.includes("quota")) errorMsg = "TTS failed: Usage limit exceeded.";
        alert(errorMsg);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full transition-colors duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-indigo-50/50 dark:bg-gray-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Mock Interviewer</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Live AI Simulation</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                 <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-full font-medium">
                    Gemini 3 Pro
                </div>
                {!sessionEnded && (
                    <button 
                        onClick={endSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold transition-colors"
                        title="End Session"
                    >
                        <XCircle className="w-4 h-4" />
                        End Session
                    </button>
                )}
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30 dark:bg-gray-900/50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}
                    
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    }`}>
                        {msg.role === 'model' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownRenderer content={msg.text} />
                            </div>
                        ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}
                        
                        {msg.role === 'model' && (
                            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button 
                                    onClick={() => playMessage(msg.text, idx)}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                    title="Read Aloud"
                                >
                                    {isPlaying === idx ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>
            ))}
            {loading && (
                <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <div className="flex items-end gap-2 relative">
                <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <textarea
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={sessionEnded ? "Session Ended" : "Type your answer here..."}
                        rows={1}
                        disabled={sessionEnded}
                        className="w-full p-3 bg-transparent border-none focus:ring-0 resize-none max-h-32 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                    />
                </div>

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sessionEnded}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                        isRecording 
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse border border-red-200 dark:border-red-800' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${sessionEnded ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isRecording ? "Stop Recording" : "Speak Answer"}
                >
                    {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || loading || sessionEnded}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
            {!sessionEnded ? (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Use the microphone to practice your spoken delivery.
                </p>
            ) : (
                 <p className="text-center text-xs text-red-400 dark:text-red-400 mt-2 font-medium">
                    Session Ended. Please start a new analysis to restart.
                </p>
            )}
        </div>
    </div>
  );
};