export type BlockType = 'listen' | 'read' | 'speak' | 'recall';

export interface RoutineBlock {
  id: string;
  type: BlockType;
  title: string;
  instruction: string;
  minutes: number;
  source?: string;
}

export interface SessionRecord {
  id: string;
  completedAt: string;
  durationSeconds: number;
  blockIds: string[];
  stage: number;
}

export interface AppState {
  version: 1;
  language: string;
  routineName: string;
  blocks: RoutineBlock[];
  history: SessionRecord[];
  sessionsPerStage: number;
  stage: number;
  createdAt: string;
  updatedAt: string;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  listen: 'Listen', read: 'Read', speak: 'Speak', recall: 'Recall'
};

export const STAGES = ['Settle in', 'Build range', 'Sustain'];
