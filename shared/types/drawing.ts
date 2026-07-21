// ─── Tool / kind enums ────────────────────────────────────────────────────────

export type DrawingKind = 'shape' | 'freehand'

export type ShapeType =
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'arrow'
  | 'line'
  | 'text'

/** Tools available in drawing mode. */
export type DrawingTool =
  | 'select'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'arrow'
  | 'line'
  | 'text'

// ─── Style ───────────────────────────────────────────────────────────────────

export interface DrawingStyle {
  stroke: string      // hex colour, e.g. '#374151'
  fill: string        // hex colour or 'none'
  strokeWidth: number // logical pixels (1–8)
  opacity: number     // 0–1
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  stroke: '#374151',
  fill: 'none',
  strokeWidth: 2,
  opacity: 1,
}

// ─── Base ────────────────────────────────────────────────────────────────────

export interface DrawingBase {
  id: string
  kind: DrawingKind
  /** Bounding-box top-left in board coordinates (always positive width/height). */
  x: number
  y: number
  width: number
  height: number
  /** Rotation in degrees around the bbox center. 0 = upright. */
  rotation?: number
  lock: boolean
  createdAt: string
  createdBy: string
  lastUpdatedAt: string
  lastUpdatedBy: string
  /** Shared nanoid tagging this item as a member of a drawing group. */
  groupId?: string
}

// ─── Shape item ───────────────────────────────────────────────────────────────

export interface ShapeItem extends DrawingBase {
  kind: 'shape'
  shapeType: ShapeType
  style: DrawingStyle
  /** Visible text label rendered inside the shape. */
  label: string
  /**
   * Raw start/end coordinates for line and arrow shapes.
   * The bounding box (x,y,width,height) is the enclosing rect of these points
   * and is used for hit-testing / selection handles.
   */
  lx1?: number
  ly1?: number
  lx2?: number
  ly2?: number
}

// ─── Freehand item ────────────────────────────────────────────────────────────

export interface FreehandItem extends DrawingBase {
  kind: 'freehand'
  /** Recorded pointer positions: [boardX, boardY, pressure (0–1)]. */
  points: [number, number, number][]
  style: DrawingStyle
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type DrawingItem = ShapeItem | FreehandItem
