// types/board.ts
// Base types for board items
export interface Task {
  task_id: string;
  content: string;
  completed: boolean;
}

interface BaseBoardItem {
  id: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
}

// Sticky Note types
export interface StickyNote extends BaseBoardItem {
  kind: 'note';
  content: {
    text: string;
    color: string;
  };
}

// Todo List types
export interface TodoList extends BaseBoardItem {
  kind: 'todo';
  content: {
    title: string;
    tasks: Task[];
  };
}

// Link types
interface BaseContent {
  url: string;
}

interface RegularLinkContent extends BaseContent {
  title: string;
  image: string;
  description: string;
}

interface OEmbedContent extends BaseContent {
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  html: string;
  type: string;
}

export interface LinkItem extends BaseBoardItem {
  kind: 'link';
  content: RegularLinkContent | OEmbedContent;
}

// Timer types
export interface TimerItem extends BaseBoardItem {
  kind: 'timer';
  content: {
    timerType?: 'Focus' | 'Short Break' | 'Long Break';
    duration?: number;
  };
}

// Text widget types
export interface TextWidget extends BaseBoardItem {
  kind: 'text';
  content: {
    text: string;
  };
}

// Combined types
export type BoardItem = StickyNote | TodoList | LinkItem | TimerItem | TextWidget;

export interface Board {
  board_id: string;
  data: {
    title?: string;
    items: BoardItem[];
  }
}

// Position type used in multiple places
export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// Board metadata type
export interface BoardMetadata {
  board_id: string;
  title: string;
}

// Type for collection of boards
export type Boards = {
  [key: string]: BoardMetadata;
}