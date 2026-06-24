/**
 * Petri Net SVG layout — defines positions for all places, transitions, and arcs.
 * Coordinates are in a logical space; the SVG viewBox maps this to screen pixels.
 */

// ViewBox dimensions
export const VIEWBOX = { width: 920, height: 420 };

// ── Places ───────────────────────────────────────────────────
export const PLACES = [
  { id: 'P0', label: 'Packet\nSource',     x: 60,  y: 185, r: 38, color: 'place' },
  { id: 'P1', label: 'Input\nQueue',       x: 220, y: 80,  r: 38, color: 'place', showCapacity: true },
  { id: 'P2', label: 'Processor\nIdle',    x: 220, y: 290, r: 38, color: 'place' },
  { id: 'P3', label: 'Processing',         x: 420, y: 185, r: 38, color: 'place' },
  { id: 'P4', label: 'Output\nQueue',      x: 580, y: 185, r: 38, color: 'place' },
  { id: 'P5', label: 'Forward\nChannel',   x: 720, y: 80,  r: 38, color: 'place' },
  { id: 'P6', label: 'Delivered\n(Sink)',   x: 860, y: 185, r: 38, color: 'deliver' },
  { id: 'P7', label: 'Dropped\n(Sink)',     x: 220, y: 390, r: 38, color: 'drop' },
];

// ── Transitions ──────────────────────────────────────────────
export const TRANSITIONS = [
  { id: 'T0', label: 'Arrive',         x: 140, y: 80,  w: 30, h: 50 },
  { id: 'T5', label: 'Drop',           x: 140, y: 290, w: 30, h: 50 },
  { id: 'T1', label: 'Start\nProcess', x: 320, y: 185, w: 30, h: 50 },
  { id: 'T2', label: 'Finish\nProcess',x: 500, y: 185, w: 30, h: 50 },
  { id: 'T3', label: 'Forward',        x: 650, y: 80,  w: 30, h: 50 },
  { id: 'T4', label: 'Deliver',        x: 790, y: 185, w: 30, h: 50 },
];

// ── Arcs (edges) ─────────────────────────────────────────────
// Each arc: { from, to, type: 'place-to-trans' | 'trans-to-place', label?, color? }
export const ARCS = [
  // P0 → T0 (Arrive path)
  { id: 'a1', from: 'P0', to: 'T0', points: [[98, 185], [125, 80]] },
  // P0 → T5 (Drop path)
  { id: 'a2', from: 'P0', to: 'T5', points: [[98, 185], [125, 290]], color: 'drop' },
  // T0 → P1
  { id: 'a3', from: 'T0', to: 'P1', points: [[170, 80], [182, 80]] },
  // T5 → P7
  { id: 'a4', from: 'T5', to: 'P7', points: [[155, 315], [220, 352]], color: 'drop' },
  // P1 → T1
  { id: 'a5', from: 'P1', to: 'T1', points: [[258, 80], [305, 165]] },
  // P2 → T1
  { id: 'a6', from: 'P2', to: 'T1', points: [[258, 290], [305, 210]] },
  // T1 → P3
  { id: 'a7', from: 'T1', to: 'P3', points: [[350, 185], [382, 185]] },
  // P3 → T2
  { id: 'a8', from: 'P3', to: 'T2', points: [[458, 185], [485, 185]] },
  // T2 → P2 (feedback arc — processor freed)
  { id: 'a9', from: 'T2', to: 'P2', points: [[500, 210], [258, 290]], dashed: true },
  // T2 → P4
  { id: 'a10', from: 'T2', to: 'P4', points: [[530, 185], [542, 185]] },
  // P4 → T3
  { id: 'a11', from: 'P4', to: 'T3', points: [[618, 185], [635, 105]] },
  // T3 → P5
  { id: 'a12', from: 'T3', to: 'P5', points: [[680, 80], [682, 80]] },
  // P5 → T4
  { id: 'a13', from: 'P5', to: 'T4', points: [[758, 80], [775, 165]] },
  // T4 → P6
  { id: 'a14', from: 'T4', to: 'P6', points: [[820, 185], [822, 185]] },
];

// ── Guard Annotations ────────────────────────────────────────
export const GUARDS = [
  { text: '|P1| < buf', x: 110, y: 52, color: 'place' },
  { text: '|P1| = buf', x: 100, y: 345, color: 'drop' },
];

// ── Packet animation paths (for Framer Motion) ──────────────
// These define the visual path a packet takes through the network
export const PACKET_PATHS = {
  // Arrival → Queue
  arrive: [
    { x: 60, y: 185 },   // P0: Source
    { x: 140, y: 80 },   // T0: Arrive
    { x: 220, y: 80 },   // P1: Queue
  ],
  // Queue → Processing
  start_process: [
    { x: 220, y: 80 },   // P1: Queue
    { x: 320, y: 185 },  // T1: Start Process
    { x: 420, y: 185 },  // P3: Processing
  ],
  // Processing → Output
  finish_process: [
    { x: 420, y: 185 },  // P3: Processing
    { x: 500, y: 185 },  // T2: Finish Process
    { x: 580, y: 185 },  // P4: Output Queue
  ],
  // Output → Forward Channel
  forward: [
    { x: 580, y: 185 },  // P4: Output Queue
    { x: 650, y: 80 },   // T3: Forward
    { x: 720, y: 80 },   // P5: Forward Channel
  ],
  // Forward → Deliver
  deliver: [
    { x: 720, y: 80 },   // P5: Forward Channel
    { x: 790, y: 185 },  // T4: Deliver
    { x: 860, y: 185 },  // P6: Delivered
  ],
  // Source → Drop
  drop: [
    { x: 60, y: 185 },   // P0: Source
    { x: 140, y: 290 },  // T5: Drop
    { x: 220, y: 390 },  // P7: Dropped
  ],
};

// Map place IDs to their token state keys
export const PLACE_STATE_MAP = {
  P1: 'queue_length',
  P2: 'idle_processors',
  P3: 'processing',
  P4: 'output_queue_length',
  P6: 'total_delivered',
  P7: 'total_dropped',
};
