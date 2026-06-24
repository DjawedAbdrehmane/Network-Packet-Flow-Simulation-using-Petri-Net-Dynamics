/**
 * QueueDisplay — Visual bar representation of input and output queues.
 */
import { motion } from 'framer-motion';
import './QueueDisplay.css';

function QueueBar({ label, current, capacity, color, icon }) {
  const slots = Math.min(capacity, 30); // Show max 30 visual slots
  const filled = Math.min(current, slots);
  const fillRatio = capacity > 0 ? current / capacity : 0;

  let statusColor = '#10b981';
  let statusLabel = 'Normal';
  if (fillRatio > 0.8) { statusColor = '#ef4444'; statusLabel = 'Critical'; }
  else if (fillRatio > 0.5) { statusColor = '#f59e0b'; statusLabel = 'Filling'; }

  return (
    <div className="queue-bar-container">
      <div className="queue-bar-header">
        <span className="queue-bar-icon">{icon}</span>
        <span className="queue-bar-label">{label}</span>
        <span className="queue-bar-count" style={{ color: statusColor }}>
          {current} / {capacity}
        </span>
      </div>
      <div className="queue-slots">
        {Array.from({ length: slots }, (_, i) => (
          <motion.div
            key={i}
            className={`queue-slot ${i < filled ? 'filled' : 'empty'}`}
            style={{
              backgroundColor: i < filled ? color : undefined,
              boxShadow: i < filled ? `0 0 6px ${color}40` : undefined,
            }}
            initial={false}
            animate={{
              scale: i < filled ? 1 : 0.85,
              opacity: i < filled ? 1 : 0.3,
            }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
      <div className="queue-bar-footer">
        <div className="queue-progress-bar">
          <motion.div
            className="queue-progress-fill"
            style={{ backgroundColor: statusColor }}
            animate={{ width: `${fillRatio * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="queue-status" style={{ color: statusColor }}>{statusLabel}</span>
      </div>
    </div>
  );
}

export default function QueueDisplay({ petriState, config }) {
  return (
    <div className="queue-display glass-strong" id="queue-display">
      <h3 className="queue-title">📦 Queue State</h3>

      <QueueBar
        label="Input Queue (P1)"
        current={petriState.P1}
        capacity={config.buffer_size}
        color="#3b82f6"
        icon="📥"
      />

      <QueueBar
        label="Output Queue (P4)"
        current={petriState.P4}
        capacity={20}
        color="#8b5cf6"
        icon="📤"
      />

      {/* Processor status */}
      <div className="processor-status">
        <div className="proc-header">
          <span>⚙️ Processors</span>
          <span className="proc-count">
            {config.num_processors - petriState.P2} / {config.num_processors} busy
          </span>
        </div>
        <div className="proc-indicators">
          {Array.from({ length: config.num_processors }, (_, i) => {
            const busy = i < (config.num_processors - petriState.P2);
            return (
              <motion.div
                key={i}
                className={`proc-dot ${busy ? 'busy' : 'idle'}`}
                animate={{
                  scale: busy ? [1, 1.2, 1] : 1,
                  backgroundColor: busy ? '#f97316' : '#10b981',
                }}
                transition={busy ? { duration: 0.8, repeat: Infinity } : { duration: 0.3 }}
              />
            );
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="counters-row">
        <div className="counter delivered">
          <span className="counter-icon">🎯</span>
          <span className="counter-value">{petriState.P6}</span>
          <span className="counter-label">Delivered</span>
        </div>
        <div className="counter dropped">
          <span className="counter-icon">❌</span>
          <span className="counter-value">{petriState.P7}</span>
          <span className="counter-label">Dropped</span>
        </div>
      </div>
    </div>
  );
}
