export interface PollOption {
  id: string;
  text: string;
  description?: string;
  badge?: string;
  imageUrl?: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  category?: string;
  options: PollOption[];
  active: boolean;
  order: number;
  createdAt: string;
}

export interface VoterResponse {
  id: string;
  voterName: string;
  voterIdentifier: string;
  votes: Record<string, string>; // pollId -> optionId
  timestamp: string;
}

export interface PollOptionTally {
  id: string;
  text: string;
  badge?: string;
  imageUrl?: string;
  count: number;
  percentage: number;
}

export interface PollTally {
  pollId: string;
  pollTitle: string;
  totalVotes: number;
  options: PollOptionTally[];
}

export interface AppConfig {
  deadlinePST: string; // ISO string e.g. "2026-09-18T18:00:00+08:00"
  deadlineLabel: string;
  eventTitle: string;
  eventSubtitle: string;
  companyName?: string;
}

export interface AdminDataResponse {
  config: AppConfig;
  polls: Poll[];
  tallies: PollTally[];
  voters: VoterResponse[];
  totalUniqueVoters: number;
}

export interface PublicPollsResponse {
  config: AppConfig;
  polls: Poll[];
  hasVoted?: boolean;
}

export interface DatabaseSchema {
  config: AppConfig;
  polls: Poll[];
  voters: VoterResponse[];
}

