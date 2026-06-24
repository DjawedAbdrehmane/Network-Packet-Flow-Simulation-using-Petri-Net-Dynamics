/**
 * App — Main application layout assembling all components.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────┐
 *   │                       Top Bar                            │
 *   ├─────────┬─────────────────────────────┬────────┬─────────┤
 *   │Controls │     PetriNetCanvas          │ Queue  │  Event  │
 *   │ Panel   │                             │Display │  Log    │
 *   │ (left)  │                             │(right) │ (right) │
 *   ├─────────┴─────────────────────────────┴────────┴─────────┤
 *   │                  MetricsDashboard (bottom)               │
 *   └─────────────────────────────────────────────────────────────┘
 */
import useSimulation from './hooks/useSimulation';
import ControlsPanel from './components/ControlsPanel';
import PetriNetCanvas from './components/PetriNetCanvas';
import MetricsDashboard from './components/MetricsDashboard';
import QueueDisplay from './components/QueueDisplay';
import EventLog from './components/EventLog';
import './App.css';

export default function App() {
  const sim = useSimulation();

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="app-topbar glass-strong" id="app-header">
        <div className="topbar-brand">
          <span className="brand-icon">🌐</span>
          <div>
            <h1 className="brand-title">Network Packet Flow Simulation</h1>
            <p className="brand-subtitle">Petri Net Model — Modeling &amp; Simulation</p>
          </div>
        </div>
        <div className="topbar-status">
          {sim.simState !== 'idle' && (
            <div className={`sim-state-badge ${sim.simState}`}>
              {sim.simState === 'running' && '● Running'}
              {sim.simState === 'paused' && '❚❚ Paused'}
              {sim.simState === 'done' && '✓ Complete'}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="app-body">
        {/* Left: Controls */}
        <ControlsPanel
          config={sim.config}
          setConfig={sim.setConfig}
          simState={sim.simState}
          speed={sim.speed}
          connectionStatus={sim.connectionStatus}
          onStart={sim.start}
          onPause={sim.pause}
          onResume={sim.resume}
          onStep={sim.step}
          onStop={sim.stop}
          onReset={sim.reset}
          onSetSpeed={sim.setSpeed}
        />

        {/* Center: Petri Net + Metrics */}
        <div className="app-center">
          <PetriNetCanvas
            petriState={sim.petriState}
            animatingPackets={sim.animatingPackets}
            config={sim.config}
            simState={sim.simState}
          />
          <MetricsDashboard
            metrics={sim.metrics}
            summary={sim.summary}
          />
        </div>

        {/* Right side panel: Queue + Event Log */}
        <div className="app-right-panels">
          <QueueDisplay
            petriState={sim.petriState}
            config={sim.config}
          />
          <EventLog events={sim.events} />
        </div>
      </div>
    </div>
  );
}
