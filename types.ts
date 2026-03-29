export type Role = 'STUDENT' | 'PROFESSOR' | 'ADMIN';
export type StudentAccessType = 'FULL' | 'RESTRICTED';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  access_type: StudentAccessType;
  is_active: boolean;
  force_password_change: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export type ViewState =
  | 'DASHBOARD'
  | 'PROGRESS'
  | 'EDITAIS'
  | 'PROJECTS'
  | 'CURRICULUM'
  | 'LANGUAGE'

  | 'MESSAGES'
  | 'AI'
  | 'COURSES'
  | 'PROFILE'
  | 'PROFESSOR_PANEL';

export interface ProjectFeedback {
  id: string;
  version_id: string;
  professor_id: string;
  feedback_text: string;
  file_url: string | null;
  file_path: string | null;
  created_at: string;
}

export interface ProjectVersion {
  id: string;
  student_id: string;
  title: string;
  version_number: number;
  file_url: string;
  file_path: string;
  file_size: string | null;
  status: 'ENVIADO' | 'EM_ANALISE' | 'REVISADO' | 'APROVADO';
  created_at: string;
  // Included via joins:
  student?: { full_name: string | null };
  feedbacks?: ProjectFeedback[];
}

export interface ProjectChecklistItem {
  id: string;
  student_id: string;
  item: string;
  done: boolean;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Edital {
  id: string;
  title: string;
  university: string;
  deadline: string;
  status: 'OPEN' | 'CLOSED';
  studentStatus?: 'INTERESTED' | 'REGISTERED' | 'APPROVED' | 'REJECTED';
}

export interface AdvisorMessage {
  id: string;
  student_id: string;
  content: string;
  is_seen: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DashboardTask {
  id: string;
  student_id: string;
  text: string;
  due_label: string;
  is_urgent: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DashboardGoal {
  id: string;
  student_id: string;
  title: string;
  percent: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface AgendaEvent {
  id: string;
  student_id: string;
  date_day: string;
  date_month: string;
  text: string;
  event_date: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ProgressStage {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  order: number;
  created_at: string;
  // Included via joins:
  items?: ProgressItem[];
}

export interface ProgressItem {
  id: string;
  stage_id: string;
  student_id: string;
  title: string;
  completed: boolean;
  order: number;
  created_at: string;
}

export interface NoticeFolder {
  id: string;
  name: string;
  created_at: string;
  // Included via joins:
  notices?: Notice[];
}

export interface Notice {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_size: string | null;
  visibility_type: 'ALL' | 'SPECIFIC';
  visible_students: string[]; // UUIDs
  created_at: string;
}

export interface CurriculumSection {
  id: string;
  student_id: string;
  title: string;
  order: number;
  created_at: string;
  expanded?: boolean; // UI State only
  items?: CurriculumItem[]; // Included via joins
}

export interface CurriculumItem {
  id: string;
  section_id: string;
  text: string;
  completed: boolean;
  order: number;
  created_at: string;
}

export interface LanguageExam {
  id: string;
  title: string;
  description: string | null;
  language: 'ENGLISH' | 'SPANISH';
  duration_minutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'INACTIVE';
  created_at: string;
  created_by?: string;
  // Included via joins:
  questions?: LanguageQuestion[]; 
}

export interface LanguageQuestion {
  id: string;
  language: 'ENGLISH' | 'SPANISH';
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  text: string;
  options: string[] | null; 
  correct_answer: string; 
  explanation: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string | null;
  created_at: string;
  created_by?: string;
  // Join UI helper:
  order?: number;
}

export interface LanguageExamAttempt {
  id: string;
  student_id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW_PENDING';
  created_at: string;
  finished_at: string | null;
  // Included via joins:
  language_exams?: LanguageExam; 
  answers?: LanguageExamAnswer[];
  profiles?: { full_name: string | null };
}

export interface LanguageExamAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  feedback: string | null;
  reviewed_by: string | null;
  created_at: string;
  // Join helper
  question?: LanguageQuestion;
}

// ==========================================
// APOSTILAS (WORKBOOK) MODULE INTERFACES
// ==========================================

export interface ApostilaFolder {
  id: string;
  name: string;
  created_at?: string;
  apostilas?: Apostila[]; // For frontend aggregation
}

export interface Apostila {
  id: string;
  folder_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_size: string;
  visibility_type: 'ALL' | 'SPECIFIC';
  visible_students: string[];
  created_at?: string;
}

// ==========================================
// COURSES (LMS) PLATFORM
// ==========================================

export interface Course {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  order: number;
  created_at?: string;
  created_by?: string;
  // Included via joins:
  course_modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at?: string;
  // Included via joins:
  course_lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  pdf_url?: string;
  pdf_path?: string;
  pdf_size?: string;
  order: number;
  created_at?: string;
  created_by?: string;
}

export interface StudentCourseAccess {
  id: string;
  student_id: string;
  course_id: string;
  created_at: string;
}
