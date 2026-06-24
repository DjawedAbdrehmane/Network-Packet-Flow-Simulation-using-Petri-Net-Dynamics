/**
 * EventLog — Scrolling, color-coded simulation event log.
 */
import { useRef, useEffect, useState } from 'react';
import { EVENT_COLORS, EVENT_LABELS } from '../utils/constants';
import './EventLog.css';

function formatEvent(evt) {
  const time = evt.time !== undefined ? `t=${evt.time.toFixed(3)}s` : '';
  const pid = evt.packet_id ? `#${evt.packet_id}` : '';

  switch (evt.type) {
    case 'arrive':
      return `${time} — Packet ${pid} arrived → Queue [${evt.queue_length}]`;
    case 'drop':
      return `${time} — Packet ${pid} DROPPED (queue full)`;
    case 'start_process':
      return `${time} — Packet ${pid} → processing (idle procs: ${evt.idle_processors})`;
    case 'finish_process':
      return `${time} — Packet ${pid} processed → output queue [${evt.output_queue_length}]`;
    case 'forward':
      return `${time} — Packet ${pid} → forwarding channel`;
    case 'deliver':
      return `${time} — Packet ${pid} delivered (delay: ${evt.delay_ms?.toFixed(1)}ms)`;
    case 'done':
      return '🏁 Simulation complete';
    case 'started':
      return '▶ Simulation started';
    case 'stopped':
      return '⏹ Simulation stopped';
    default:
      return `${time} — ${evt.type}`;
  }
}

export default function EventLog({ events }) {
  const listRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0; // Events are prepended (newest first)
    }
  }, [events, autoScroll]);

  const handleScroll = () => {
    if (listRef.current) {
      setAutoScroll(listRef.current.scrollTop < 10);
    }
  };

  return (
    <div className="event-log glass-strong" id="event-log">
      <div className="event-log-header">
        <h3 className="event-log-title">📋 Event Log</h3>
        <span className="event-count">{events.length} events</span>
      </div>
      <div
        className="event-list"
        ref={listRef}
        onScroll={handleScroll}
      >
        {events.length === 0 ? (
          <div className="event-empty">No events yet — start a simulation</div>
        ) : (
          events.map((evt, i) => (
            <div
              key={i}
              className={`event-item ${evt.type}`}
              style={{ '--event-color': EVENT_COLORS[evt.type] || '#94a3b8' }}
            >
              <span className="event-badge">
                {EVENT_LABELS[evt.type] || evt.type}
              </span>
              <span className="event-text">{formatEvent(evt)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
