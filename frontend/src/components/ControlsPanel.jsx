/**
 * ControlsPanel — Simulation parameter controls and playback buttons.
 */
import { useState } from 'react';
import { PRESETS, SPEED_OPTIONS } from '../utils/constants';
import './ControlsPanel.css';

export default function ControlsPanel({
  config,
  setConfig,
  simState,
  speed,
  connectionStatus,
  onStart,
  onPause,
  onResume,
  onStep,
  onStop,
  onReset,
  onSetSpeed,
}) {
  const [showPresets, setShowPresets] = useState(false);

  const isIdle = simState === 'idle' || simState === 'done';
  const isRunning = simState === 'running';
  const isPaused = simState === 'paused';

  const handleSlider = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset) => {
    setConfig({ ...config, ...preset.config });
    setShowPresets(false);
  };

  return (
    <aside className="controls-panel glass-strong" id="controls-panel">
      {/* Header */}
      <div className="controls-header">
        <div className="controls-title">
          <span className="controls-icon">⚙️</span>
          <h2>Simulation Controls</h2>
        </div>
        <div className={`status-badge ${connectionStatus}`} title={connectionStatus}>
          <span className="status-dot" />
          {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      </div>

      {/* Presets */}
      <div className="control-section">
        <button
          className="preset-toggle"
          onClick={() => setShowPresets(!showPresets)}
          id="preset-toggle-btn"
        >
          <span>🎛️ Presets</span>
          <span className={`chevron ${showPresets ? 'open' : ''}`}>▾</span>
        </button>
        {showPresets && (
          <div className="presets-list animate-fade-in">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                className="preset-item"
                onClick={() => applyPreset(p)}
                title={p.description}
              >
                <span className="preset-name">{p.name}</span>
                <span className="preset-desc">{p.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Parameter Sliders */}
      <div className="control-section">
        <h3 className="section-label">Parameters</h3>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="arrival-rate">Arrival Rate (λ)</label>
            <span className="slider-value">{config.arrival_rate.toFixed(1)} pkt/s</span>
          </div>
          <input
            id="arrival-rate"
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={config.arrival_rate}
            onChange={(e) => handleSlider('arrival_rate', parseFloat(e.target.value))}
            disabled={!isIdle}
            className="styled-slider slider-primary"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="service-rate">Service Rate (μ)</label>
            <span className="slider-value">{config.service_rate.toFixed(1)} pkt/s</span>
          </div>
          <input
            id="service-rate"
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={config.service_rate}
            onChange={(e) => handleSlider('service_rate', parseFloat(e.target.value))}
            disabled={!isIdle}
            className="styled-slider slider-accent"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="buffer-size">Buffer Size</label>
            <span className="slider-value">{config.buffer_size}</span>
          </div>
          <input
            id="buffer-size"
            type="range"
            min="1"
            max="100"
            step="1"
            value={config.buffer_size}
            onChange={(e) => handleSlider('buffer_size', parseInt(e.target.value))}
            disabled={!isIdle}
            className="styled-slider slider-warning"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="sim-time">Simulation Time</label>
            <span className="slider-value">{config.sim_time.toFixed(0)}s</span>
          </div>
          <input
            id="sim-time"
            type="range"
            min="50"
            max="1000"
            step="50"
            value={config.sim_time}
            onChange={(e) => handleSlider('sim_time', parseFloat(e.target.value))}
            disabled={!isIdle}
            className="styled-slider slider-info"
          />
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="seed-input">Seed</label>
            <span className="slider-value">{config.seed}</span>
          </div>
          <input
            id="seed-input"
            type="number"
            min="0"
            max="99999"
            value={config.seed}
            onChange={(e) => handleSlider('seed', parseInt(e.target.value) || 0)}
            disabled={!isIdle}
            className="seed-input"
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="control-section">
        <h3 className="section-label">Playback</h3>
        <div className="playback-buttons">
          {isIdle && (
            <button className="btn btn-primary btn-play" onClick={() => onStart(config)} id="play-btn">
              <span className="btn-icon">▶</span> Play
            </button>
          )}
          {isRunning && (
            <button className="btn btn-warning btn-pause" onClick={onPause} id="pause-btn">
              <span className="btn-icon">⏸</span> Pause
            </button>
          )}
          {isPaused && (
            <>
              <button className="btn btn-primary" onClick={onResume} id="resume-btn">
                <span className="btn-icon">▶</span> Resume
              </button>
              <button className="btn btn-secondary" onClick={onStep} id="step-btn">
                <span className="btn-icon">⏭</span> Step
              </button>
            </>
          )}
          {!isIdle && (
            <button className="btn btn-danger" onClick={onStop} id="stop-btn">
              <span className="btn-icon">⏹</span> Stop
            </button>
          )}
          <button className="btn btn-ghost" onClick={onReset} id="reset-btn">
            <span className="btn-icon">↺</span> Reset
          </button>
        </div>
      </div>

      {/* Speed Control */}
      <div className="control-section">
        <h3 className="section-label">Speed</h3>
        <div className="speed-buttons">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`speed-btn ${speed === opt.value ? 'active' : ''}`}
              onClick={() => onSetSpeed(opt.value)}
              id={`speed-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Utilization indicator */}
      <div className="control-section">
        <div className="utilization-card">
          <span className="utilization-label">ρ = λ / μ</span>
          <span className={`utilization-value ${config.arrival_rate / config.service_rate > 1 ? 'overloaded' : config.arrival_rate / config.service_rate > 0.8 ? 'high' : 'normal'}`}>
            {(config.arrival_rate / config.service_rate).toFixed(2)}
          </span>
          <span className="utilization-hint">
            {config.arrival_rate / config.service_rate > 1 ? '⚠ Overloaded' : config.arrival_rate / config.service_rate > 0.8 ? '⚡ High' : '✅ Stable'}
          </span>
        </div>
      </div>
    </aside>
  );
}
