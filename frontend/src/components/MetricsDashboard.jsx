/**
 * MetricsDashboard — KPI cards and live Recharts for delay, throughput, loss, queue.
 */
import { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import './MetricsDashboard.css';

const CHART_COLORS = {
  throughput: '#3b82f6',
  delay: '#f59e0b',
  loss: '#ef4444',
  queue: '#8b5cf6',
};

function KpiCard({ label, value, unit, color, icon }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <span className="kpi-value">{value}</span>
        <span className="kpi-unit">{unit}</span>
      </div>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function MiniChart({ data, dataKey, color, title, yLabel, type = 'line' }) {
  // Downsample for performance — take every Nth point
  const sampled = useMemo(() => {
    if (data.length <= 120) return data;
    const step = Math.ceil(data.length / 120);
    return data.filter((_, i) => i % step === 0);
  }, [data]);

  if (sampled.length < 2) {
    return (
      <div className="mini-chart empty">
        <span className="chart-title">{title}</span>
        <div className="chart-empty-msg">Waiting for data…</div>
      </div>
    );
  }

  return (
    <div className="mini-chart">
      <span className="chart-title">{title}</span>
      <ResponsiveContainer width="100%" height={130}>
        {type === 'area' ? (
          <AreaChart data={sampled} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v.toFixed(0)}s`} />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#64748b' } }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color }}
              labelFormatter={(v) => `t = ${Number(v).toFixed(1)}s`}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} dot={false} />
          </AreaChart>
        ) : (
          <LineChart data={sampled} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v.toFixed(0)}s`} />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#64748b' } }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color }}
              labelFormatter={(v) => `t = ${Number(v).toFixed(1)}s`}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function MetricsDashboard({ metrics, summary }) {
  const { arrived, delivered, dropped, throughput, lossRate, meanDelayMs } = metrics;
  const lossPercent = arrived > 0 ? ((dropped / arrived) * 100).toFixed(1) : '0.0';

  return (
    <div className="metrics-dashboard" id="metrics-dashboard">
      <h3 className="dashboard-title">📊 Live Metrics</h3>

      {/* KPI Row */}
      <div className="kpi-row">
        <KpiCard label="Arrived" value={arrived} unit="pkts" color="#3b82f6" icon="📥" />
        <KpiCard label="Delivered" value={delivered} unit="pkts" color="#10b981" icon="🎯" />
        <KpiCard label="Dropped" value={dropped} unit="pkts" color="#ef4444" icon="❌" />
        <KpiCard label="Throughput" value={throughput.toFixed(2)} unit="pkt/s" color="#3b82f6" icon="⚡" />
        <KpiCard label="Loss Rate" value={`${lossPercent}%`} unit="" color="#ef4444" icon="📉" />
        <KpiCard label="Avg Delay" value={meanDelayMs.toFixed(1)} unit="ms" color="#f59e0b" icon="⏱️" />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <MiniChart
          data={metrics.throughputHistory}
          dataKey="value" color={CHART_COLORS.throughput}
          title="Throughput (pkt/s)" yLabel="pkt/s"
        />
        <MiniChart
          data={metrics.delayHistory}
          dataKey="value" color={CHART_COLORS.delay}
          title="Packet Delay (ms)" yLabel="ms"
        />
        <MiniChart
          data={metrics.lossHistory}
          dataKey="value" color={CHART_COLORS.loss}
          title="Loss Rate (%)" yLabel="%"
        />
        <MiniChart
          data={metrics.queueHistory}
          dataKey="value" color={CHART_COLORS.queue}
          title="Queue Occupancy" yLabel="pkts" type="area"
        />
      </div>

      {/* Final summary */}
      {summary && (
        <div className="summary-banner animate-fade-in">
          <span className="summary-icon">🏁</span>
          <div className="summary-stats">
            <span>Simulation Complete — </span>
            <span className="stat">Delivered: <strong>{summary.packets_delivered}</strong></span>
            <span className="stat">Loss: <strong>{(summary.packet_loss_rate * 100).toFixed(1)}%</strong></span>
            <span className="stat">Avg Delay: <strong>{summary.mean_delay_ms.toFixed(1)} ms</strong></span>
            <span className="stat">P95 Delay: <strong>{summary.p95_delay_ms.toFixed(1)} ms</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
