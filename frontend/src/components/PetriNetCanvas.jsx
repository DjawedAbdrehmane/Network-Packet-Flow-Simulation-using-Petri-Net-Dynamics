/**
 * PetriNetCanvas — SVG-based Petri Net diagram with animated packet flow.
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PLACES, TRANSITIONS, ARCS, GUARDS, PACKET_PATHS, VIEWBOX } from '../utils/petriNetLayout';
import { COLORS } from '../utils/constants';
import './PetriNetCanvas.css';

// Color resolver
const resolveColor = (colorKey) => {
  const map = {
    place: COLORS.place,
    deliver: COLORS.deliver,
    drop: COLORS.drop,
    transition: COLORS.transition,
  };
  return map[colorKey] || COLORS.place;
};

// Arrowhead marker ID
const MARKER_ID = 'arrowhead';
const MARKER_DROP_ID = 'arrowhead-drop';

export default function PetriNetCanvas({ petriState, animatingPackets, config, simState }) {
  const bufferSize = config?.buffer_size ?? 10;

  // Compute fill percentage for P1 queue bar
  const queueFill = bufferSize > 0 ? Math.min(petriState.P1 / bufferSize, 1) : 0;
  const queueColor = queueFill > 0.8 ? COLORS.drop : queueFill > 0.5 ? '#f59e0b' : COLORS.place;

  // Memoize static elements
  const staticArcs = useMemo(() => (
    ARCS.map((arc) => {
      const [p1, p2] = arc.points;
      const color = arc.color === 'drop' ? COLORS.drop : COLORS.arc;
      const markerId = arc.color === 'drop' ? MARKER_DROP_ID : MARKER_ID;
      return (
        <line
          key={arc.id}
          x1={p1[0]} y1={p1[1]}
          x2={p2[0]} y2={p2[1]}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={arc.dashed ? '6 4' : 'none'}
          markerEnd={`url(#${markerId})`}
          opacity={0.7}
        />
      );
    })
  ), []);

  return (
    <div className="petri-canvas-wrapper" id="petri-net-canvas">
      <div className="canvas-header">
        <h2 className="canvas-title">Petri Net — Network Packet Flow</h2>
        <div className="canvas-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: COLORS.place }} /> Place</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLORS.transition }} /> Transition</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLORS.packet }} /> Packet</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: COLORS.drop }} /> Drop</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="petri-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Defs: arrowheads, glows, gradients */}
        <defs>
          <marker id={MARKER_ID} viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.arc} />
          </marker>
          <marker id={MARKER_DROP_ID} viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.drop} />
          </marker>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="placeGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLORS.place} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid dots */}
        <g opacity="0.06">
          {Array.from({ length: 23 }, (_, i) =>
            Array.from({ length: 11 }, (_, j) => (
              <circle key={`g-${i}-${j}`} cx={i * 40 + 10} cy={j * 40 + 5} r="1" fill="#94a3b8" />
            ))
          )}
        </g>

        {/* Arcs */}
        <g className="arcs-layer">{staticArcs}</g>

        {/* Places */}
        <g className="places-layer">
          {PLACES.map((place) => {
            const fill = resolveColor(place.color);
            const tokens = petriState[place.id] ?? 0;
            const isQueue = place.id === 'P1';
            return (
              <g key={place.id}>
                {/* Outer glow ring */}
                <circle cx={place.x} cy={place.y} r={place.r + 6} fill="none"
                  stroke={fill} strokeWidth="1" opacity="0.15" />
                {/* Main circle */}
                <circle cx={place.x} cy={place.y} r={place.r}
                  fill={fill} fillOpacity="0.15" stroke={fill} strokeWidth="2.5" />
                {/* Inner highlight */}
                <circle cx={place.x} cy={place.y} r={place.r}
                  fill="url(#placeGrad)" />
                {/* Place ID */}
                <text x={place.x} y={place.y + 1} textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">
                  {place.id}
                </text>
                {/* Label below */}
                {place.label.split('\n').map((line, i) => (
                  <text key={i} x={place.x} y={place.y + place.r + 14 + i * 13}
                    textAnchor="middle" fill={COLORS.textSecondary} fontSize="9.5"
                    fontFamily="Inter, sans-serif" fontStyle="italic">
                    {line}
                  </text>
                ))}
                {/* Token count badge */}
                {tokens > 0 && (
                  <g>
                    <rect x={place.x + place.r - 8} y={place.y - place.r - 6}
                      width={Math.max(20, String(tokens).length * 9 + 8)} height="18"
                      rx="9" fill={COLORS.badge} stroke={fill} strokeWidth="1.5" />
                    <text x={place.x + place.r + Math.max(10, String(tokens).length * 4.5 + 4) - 8}
                      y={place.y - place.r + 7}
                      textAnchor="middle" fill="white" fontSize="10.5" fontWeight="600"
                      fontFamily="JetBrains Mono, monospace">
                      {tokens}
                    </text>
                  </g>
                )}
                {/* Queue capacity bar for P1 */}
                {isQueue && (
                  <g>
                    <rect x={place.x - 25} y={place.y - place.r - 22} width="50" height="6"
                      rx="3" fill={COLORS.badge} stroke={COLORS.arc} strokeWidth="0.5" />
                    <rect x={place.x - 25} y={place.y - place.r - 22}
                      width={50 * queueFill} height="6"
                      rx="3" fill={queueColor}>
                      <animate attributeName="width" to={50 * queueFill} dur="0.3s" />
                    </rect>
                    <text x={place.x} y={place.y - place.r - 28} textAnchor="middle"
                      fill={COLORS.textMuted} fontSize="8" fontFamily="JetBrains Mono, monospace">
                      {petriState.P1}/{bufferSize}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Transitions */}
        <g className="transitions-layer">
          {TRANSITIONS.map((trans) => (
            <g key={trans.id}>
              <rect x={trans.x - trans.w / 2} y={trans.y - trans.h / 2}
                width={trans.w} height={trans.h} rx="4"
                fill={COLORS.transition} fillOpacity="0.2"
                stroke={COLORS.transition} strokeWidth="2.5" />
              <text x={trans.x} y={trans.y + 1} textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
                {trans.id}
              </text>
              {trans.label.split('\n').map((line, i) => (
                <text key={i} x={trans.x} y={trans.y + trans.h / 2 + 14 + i * 12}
                  textAnchor="middle" fill={COLORS.textMuted} fontSize="8.5"
                  fontFamily="Inter, sans-serif">
                  {line}
                </text>
              ))}
            </g>
          ))}
        </g>

        {/* Guard annotations */}
        <g className="guards-layer">
          {GUARDS.map((guard, i) => (
            <text key={i} x={guard.x} y={guard.y}
              fill={resolveColor(guard.color)} fontSize="9.5"
              fontFamily="JetBrains Mono, monospace" fontStyle="italic" fontWeight="500">
              {guard.text}
            </text>
          ))}
        </g>

        {/* Animated packets */}
        <AnimatePresence>
          {animatingPackets.map((pkt) => {
            const path = PACKET_PATHS[pkt.type];
            if (!path || path.length < 2) return null;

            const isDrop = pkt.type === 'drop';
            const isDeliver = pkt.type === 'deliver';
            const color = isDrop ? COLORS.drop : isDeliver ? COLORS.deliver : COLORS.packet;
            const glowFilter = isDrop ? 'url(#glow-red)' : isDeliver ? 'url(#glow-green)' : 'url(#glow-cyan)';

            // Build x,y keyframe arrays from path
            const xFrames = path.map(p => p.x);
            const yFrames = path.map(p => p.y);

            return (
              <motion.circle
                key={pkt.id}
                r={5}
                fill={color}
                filter={glowFilter}
                initial={{ cx: xFrames[0], cy: yFrames[0], opacity: 0, r: 2 }}
                animate={{
                  cx: xFrames,
                  cy: yFrames,
                  opacity: [0, 1, 1, 0.6],
                  r: [3, 5, 5, 4],
                }}
                exit={{ opacity: 0, r: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            );
          })}
        </AnimatePresence>

        {/* Idle state overlay text */}
        {simState === 'idle' && (
          <text x={VIEWBOX.width / 2} y={VIEWBOX.height - 15}
            textAnchor="middle" fill={COLORS.textMuted} fontSize="11"
            fontFamily="Inter, sans-serif">
            Press ▶ Play to start the simulation
          </text>
        )}
      </svg>
    </div>
  );
}
