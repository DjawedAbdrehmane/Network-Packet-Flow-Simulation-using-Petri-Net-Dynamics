/**
 * Constants for the Network Packet Flow Simulation UI.
 */

// ── Color Palette ────────────────────────────────────────────
export const COLORS = {
  place: '#3b82f6',
  placeStroke: '#60a5fa',
  transition: '#f97316',
  transitionStroke: '#fb923c',
  transitionFiring: '#fbbf24',
  drop: '#ef4444',
  dropGlow: 'rgba(239, 68, 68, 0.5)',
  deliver: '#10b981',
  deliverGlow: 'rgba(16, 185, 129, 0.5)',
  packet: '#06b6d4',
  packetGlow: 'rgba(6, 182, 212, 0.6)',
  packetDrop: '#ef4444',
  arc: '#475569',
  arcActive: '#94a3b8',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  background: '#0c1019',
  surface: '#111827',
  badge: '#1e293b',
};

// ── Event Type Colors ────────────────────────────────────────
export const EVENT_COLORS = {
  arrive: '#3b82f6',
  drop: '#ef4444',
  start_process: '#f97316',
  finish_process: '#f59e0b',
  forward: '#8b5cf6',
  deliver: '#10b981',
  done: '#06b6d4',
  started: '#94a3b8',
  stopped: '#94a3b8',
  error: '#ef4444',
};

// ── Event Type Labels ────────────────────────────────────────
export const EVENT_LABELS = {
  arrive: '📥 Arrive',
  drop: '❌ Dropped',
  start_process: '⚙️ Processing',
  finish_process: '✅ Processed',
  forward: '📤 Forwarding',
  deliver: '🎯 Delivered',
  done: '🏁 Complete',
};

// ── Animation Timing ─────────────────────────────────────────
export const ANIMATION = {
  packetDuration: 0.6,       // seconds for packet to travel an arc
  transitionFlash: 0.3,      // seconds for transition fire flash
  tokenFade: 0.2,            // seconds for token count update
  chartUpdateInterval: 500,  // ms between chart updates
};

// ── Simulation Presets ───────────────────────────────────────
export const PRESETS = [
  {
    name: 'Light Load',
    description: 'λ=2, μ=6, buf=10 — Well below capacity',
    config: { arrival_rate: 2.0, service_rate: 6.0, buffer_size: 10, forward_rate: 10.0, num_processors: 1, sim_time: 200, seed: 42 },
  },
  {
    name: 'Moderate Load',
    description: 'λ=4, μ=6, buf=10 — Approaching saturation',
    config: { arrival_rate: 4.0, service_rate: 6.0, buffer_size: 10, forward_rate: 10.0, num_processors: 1, sim_time: 200, seed: 42 },
  },
  {
    name: 'Near Capacity',
    description: 'λ=5.5, μ=6, buf=10 — Close to service rate',
    config: { arrival_rate: 5.5, service_rate: 6.0, buffer_size: 10, forward_rate: 10.0, num_processors: 1, sim_time: 200, seed: 42 },
  },
  {
    name: 'Overloaded',
    description: 'λ=8, μ=6, buf=5 — Exceeds capacity, small buffer',
    config: { arrival_rate: 8.0, service_rate: 6.0, buffer_size: 5, forward_rate: 10.0, num_processors: 1, sim_time: 200, seed: 42 },
  },
  {
    name: 'Heavy Traffic, Large Buffer',
    description: 'λ=10, μ=6, buf=50 — High arrival, large buffer absorbs',
    config: { arrival_rate: 10.0, service_rate: 6.0, buffer_size: 50, forward_rate: 10.0, num_processors: 1, sim_time: 300, seed: 42 },
  },
];

// ── Speed Options ────────────────────────────────────────────
export const SPEED_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '5×', value: 5 },
  { label: '10×', value: 10 },
  { label: '25×', value: 25 },
];
