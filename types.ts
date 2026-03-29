export type Availability = 'Yes' | 'No' | 'Ongoing' | 'Unset';

export type UserRole = 'Admin' | 'Admin Editor' | 'Member' | 'Active Member' | 'Pending';

export type AvailabilityType = 'All Day' | 'Morning' | 'Afternoon';

export interface UnavailablePeriod {
  id: string;
  startDate: string;
  endDate: string;
  type: AvailabilityType;
}

export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  status?: 'Active' | 'Inactive';
  role?: UserRole;
  email?: string;
  password?: string; // In a real app, this would be hashed
  isApproved?: boolean;
  unavailablePeriods?: UnavailablePeriod[];
}

export type DisciplineType = 'Singles' | 'Pairs' | 'Triples' | 'Fours';

export interface PositionAssignment {
  positionName: string; // e.g., "Lead", "Skip", "2nd"
  playerId: string | null;
  availability: Availability;
}

export interface DisciplineInstance {
  id: string;
  type: DisciplineType;
  assignments: PositionAssignment[];
  pointsFor: string;
  pointsAgainst: string;
}

export interface Match {
  id: string;
  date: string;
  time: string;
  venue: string;
  isHome: boolean; // Home or Away
  competition: string; // e.g., "Watson Shield"
  opponent: string; // e.g., "Papanui Club"
  disciplines: DisciplineInstance[]; // Dynamic array containing any number of teams
  lastEmailSent?: string; // ISO date string of when the team sheet was emailed
  selector1Id?: string;
  selector2Id?: string;
  selector1Picks?: DisciplineInstance[];
  selector2Picks?: DisciplineInstance[];
  isConfirmed?: boolean;
}

export interface Scorecard {
    id: string;
    competition: string;
    selectedType: DisciplineType;
    playByDate: string;
    isHome: boolean;
    teamA: DisciplineInstance;
    teamB: DisciplineInstance;
    isNew?: boolean;
    isEditing?: boolean;
    agreedPlayDate?: string;
    startTime?: string;
    isConfirmed?: boolean;
}

export interface ChatMessage {
  id: string;
  scorecardId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  playerName?: string;
  playerAvatar?: string;
}

export type ViewMode = 'Admin' | 'Admin Editor' | 'Member' | 'Database';
