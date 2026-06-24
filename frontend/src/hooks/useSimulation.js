/**
 * useSimulation — Custom hook for WebSocket-based simulation state management.
 * 
 * Handles:
 *  - WebSocket connection lifecycle
 *  - Simulation control (start, pause, resume, step, stop)
 *  - Petri Net state tracking (token counts per place)
 *  - Metrics accumulation (delays, throughput, loss)
 *  - Animated packet queue management
 */
import { useState, useRef, useCallback, useEffect } from 'react';
const getWsUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const wsProto = envUrl.startsWith('https') ? 'wss' : 'ws';
    const cleanUrl = envUrl.replace(/^(https?:\/\/)/, '');
    return `${wsProto}://${cleanUrl.replace(/\/$/, '')}/ws/simulate`;
  }
  return `ws://${window.location.hostname}:8000/ws/simulate`;
};

const WS_URL = getWsUrl();

const initialPetriState = () => ({
  P0: 0,  // Source (always implied)
  P1: 0,  // Input Queue
  P2: 1,  // Processor Idle (starts with 1)
  P3: 0,  // Processing
  P4: 0,  // Output Queue
  P5: 0,  // Forward Channel
  P6: 0,  // Delivered
  P7: 0,  // Dropped
});

const initialMetrics = () => ({
  arrived: 0,
  delivered: 0,
  dropped: 0,
  throughput: 0,
  lossRate: 0,
  meanDelayMs: 0,
  delays: [],
  throughputHistory: [],
  lossHistory: [],
  delayHistory: [],
  queueHistory: [],
});

export default function useSimulation() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [simState, setSimState] = useState('idle'); // idle | running | paused | done
  const [petriState, setPetriState] = useState(initialPetriState());
  const [metrics, setMetrics] = useState(initialMetrics());
  const [events, setEvents] = useState([]);
  const [animatingPackets, setAnimatingPackets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [speed, setSpeedState] = useState(1);
  const [config, setConfig] = useState({
    arrival_rate: 5.0,
    service_rate: 6.0,
    forward_rate: 10.0,
    buffer_size: 10,
    num_processors: 1,
    sim_time: 200.0,
    seed: 42,
  });

  const wsRef = useRef(null);
  const packetIdCounter = useRef(0);

  // ── Connect WebSocket ──────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleEvent(data);
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setSimState((prev) => (prev === 'running' ? 'idle' : prev));
    };

    wsRef.current = ws;
  }, []);

  // ── Disconnect ─────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // ── Send message ───────────────────────────────────────────
  const send = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Event handler ──────────────────────────────────────────
  const handleEvent = useCallback((data) => {
    const { type } = data;

    // Add to event log (keep last 100)
    setEvents((prev) => {
      const next = [data, ...prev];
      return next.length > 100 ? next.slice(0, 100) : next;
    });

    // Spawn animated packet
    if (['arrive', 'drop', 'start_process', 'finish_process', 'forward', 'deliver'].includes(type)) {
      packetIdCounter.current += 1;
      const animPacket = {
        id: packetIdCounter.current,
        type,
        packetId: data.packet_id,
        createdAt: Date.now(),
      };
      setAnimatingPackets((prev) => {
        const next = [...prev, animPacket];
        // Limit to 60 simultaneous animated packets
        return next.length > 60 ? next.slice(next.length - 60) : next;
      });

      // Remove after animation completes
      setTimeout(() => {
        setAnimatingPackets((prev) => prev.filter((p) => p.id !== animPacket.id));
      }, 1200);
    }

    // Update Petri Net state
    setPetriState((prev) => {
      const next = { ...prev };
      switch (type) {
        case 'arrive':
          next.P1 = data.queue_length ?? prev.P1;
          break;
        case 'drop':
          next.P7 = data.total_dropped ?? prev.P7 + 1;
          break;
        case 'start_process':
          next.P1 = data.queue_length ?? Math.max(0, prev.P1 - 1);
          next.P2 = data.idle_processors ?? Math.max(0, prev.P2 - 1);
          next.P3 = prev.P3 + 1;
          break;
        case 'finish_process':
          next.P2 = data.idle_processors ?? prev.P2 + 1;
          next.P3 = Math.max(0, prev.P3 - 1);
          next.P4 = data.output_queue_length ?? prev.P4 + 1;
          break;
        case 'forward':
          next.P4 = data.output_queue_length ?? Math.max(0, prev.P4 - 1);
          next.P5 = prev.P5 + 1;
          break;
        case 'deliver':
          next.P5 = Math.max(0, prev.P5 - 1);
          next.P6 = data.total_delivered ?? prev.P6 + 1;
          break;
        default:
          break;
      }
      return next;
    });

    // Update metrics
    setMetrics((prev) => {
      const next = { ...prev };
      if (data.total_arrived !== undefined) next.arrived = data.total_arrived;
      if (data.total_delivered !== undefined) next.delivered = data.total_delivered;
      if (data.total_dropped !== undefined) next.dropped = data.total_dropped;
      if (data.throughput !== undefined) next.throughput = data.throughput;
      if (data.loss_rate !== undefined) next.lossRate = data.loss_rate;
      if (data.mean_delay_ms !== undefined) next.meanDelayMs = data.mean_delay_ms;

      if (data.delay_ms !== undefined) {
        next.delays = [...prev.delays, data.delay_ms];
      }

      // Track time-series for charts (on deliver events)
      if (type === 'deliver' && data.time) {
        const t = data.time;
        next.throughputHistory = [...prev.throughputHistory, { time: t, value: data.throughput ?? 0 }];
        next.lossHistory = [...prev.lossHistory, { time: t, value: (data.loss_rate ?? 0) * 100 }];
        next.delayHistory = [...prev.delayHistory, { time: t, value: data.delay_ms ?? 0 }];
      }
      if ((type === 'arrive' || type === 'drop') && data.time) {
        next.queueHistory = [...prev.queueHistory, { time: data.time, value: data.queue_length ?? 0 }];
      }

      return next;
    });

    // Handle state transitions
    if (type === 'started') {
      setSimState('running');
    } else if (type === 'done') {
      setSimState('done');
      setSummary(data.summary || null);
    } else if (type === 'stopped') {
      setSimState('idle');
    }
  }, []);

  // ── Control actions ────────────────────────────────────────
  const start = useCallback(
    (cfg) => {
      const simConfig = cfg || config;
      setConfig(simConfig);
      // Reset state
      setPetriState(() => {
        const s = initialPetriState();
        s.P2 = simConfig.num_processors || 1;
        return s;
      });
      setMetrics(initialMetrics());
      setEvents([]);
      setAnimatingPackets([]);
      setSummary(null);
      packetIdCounter.current = 0;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Connect first, then start
        const ws = new WebSocket(WS_URL);
        ws.onopen = () => {
          setConnectionStatus('connected');
          ws.send(JSON.stringify({ action: 'start', config: simConfig, speed }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleEvent(data);
        };
        ws.onerror = () => setConnectionStatus('disconnected');
        ws.onclose = () => {
          setConnectionStatus('disconnected');
          setSimState((prev) => (prev === 'running' ? 'idle' : prev));
        };
        wsRef.current = ws;
      } else {
        send({ action: 'start', config: simConfig, speed });
      }
    },
    [config, speed, send, handleEvent]
  );

  const pause = useCallback(() => {
    send({ action: 'pause' });
    setSimState('paused');
  }, [send]);

  const resume = useCallback(() => {
    send({ action: 'resume' });
    setSimState('running');
  }, [send]);

  const step = useCallback(() => {
    send({ action: 'step' });
    setSimState('paused');
  }, [send]);

  const stop = useCallback(() => {
    send({ action: 'stop' });
    setSimState('idle');
  }, [send]);

  const setSpeed = useCallback(
    (newSpeed) => {
      setSpeedState(newSpeed);
      send({ action: 'set_speed', speed: newSpeed });
    },
    [send]
  );

  const reset = useCallback(() => {
    stop();
    setPetriState(initialPetriState());
    setMetrics(initialMetrics());
    setEvents([]);
    setAnimatingPackets([]);
    setSummary(null);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    // State
    connectionStatus,
    simState,
    petriState,
    metrics,
    events,
    animatingPackets,
    summary,
    config,
    speed,
    // Actions
    setConfig,
    start,
    pause,
    resume,
    step,
    stop,
    setSpeed,
    reset,
    connect,
    disconnect,
  };
}
