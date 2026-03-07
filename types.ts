export type Role = 'STUDENT' | 'PROFESSOR';

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

export interface ProjectVersion {
  id: string;
  version: string;
  date: string;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED';
  feedback?: string;
  fileUrl: string;
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
}

export interface DashboardTask {
  id: string;
  student_id: string;
  text: string;
  due_label: string;
  is_urgent: boolean;
  created_at: string;
}

export interface DashboardGoal {
  id: string;
  student_id: string;
  title: string;
  percent: number;
  created_at: string;
}

export interface AgendaEvent {
  id: string;
  student_id: string;
  date_day: string;
  date_month: string;
  text: string;
  event_date: string;
  created_at: string;
}

