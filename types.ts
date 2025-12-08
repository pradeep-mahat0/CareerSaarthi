export enum AgentType {
  COMPANY_RESEARCH = 'COMPANY_RESEARCH',
  RESUME_OPTIMIZATION = 'RESUME_OPTIMIZATION',
  RECRUITMENT_PROCESS = 'RECRUITMENT_PROCESS',
  PREVIOUS_QUESTIONS = 'PREVIOUS_QUESTIONS',
  HR_ANSWER_GENERATION = 'HR_ANSWER_GENERATION',
  MOCK_INTERVIEWER = 'MOCK_INTERVIEWER',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AgentResult {
  type: AgentType;
  loading: boolean;
  content?: string;
  error?: string;
  troubleshooting?: string[];
  sources?: GroundingSource[];
}

export interface UserInput {
  companyName: string;
  jobRole: string;
  jobDescription: string;
  resumeContent: string;
}

export interface AgentConfig {
  id: AgentType;
  title: string;
  description: string;
  icon: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
}