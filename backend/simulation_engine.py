"""
Adapted simulation engine for the interactive visualization backend.

This is a fork of the original simulation.py that:
  1. Yields events at each transition firing (generator-based)
  2. Supports running to completion for batch/REST mode
  3. Preserves all original Petri Net simulation logic
"""

import heapq
import random
import statistics
from dataclasses import dataclass, field
from typing import List, Generator, Dict, Any

# Event type constants
ARRIVE = "ARRIVE"
FINISH_PROCESS = "FINISH_PROCESS"
DELIVER = "DELIVER"


@dataclass
class Packet:
    pid: int
    arrival_time: float = 0.0
    service_start: float = 0.0
    service_end: float = 0.0
    forward_start: float = 0.0
    deliver_time: float = 0.0
    dropped: bool = False


@dataclass
class SimConfig:
    arrival_rate: float = 5.0
    service_rate: float = 6.0
    forward_rate: float = 10.0
    buffer_size: int = 10
    num_processors: int = 1
    sim_time: float = 200.0
    seed: int = 42


@dataclass
class SimResults:
    config: SimConfig
    packets_arrived: int = 0
    packets_delivered: int = 0
    packets_dropped: int = 0
    delays: List[float] = field(default_factory=list)
    queue_waits: List[float] = field(default_factory=list)
    service_times: List[float] = field(default_factory=list)

    @property
    def throughput(self):
        return self.packets_delivered / self.config.sim_time if self.config.sim_time > 0 else 0.0

    @property
    def packet_loss_rate(self):
        return self.packets_dropped / self.packets_arrived if self.packets_arrived else 0.0

    @property
    def mean_delay(self):
        return statistics.mean(self.delays) if self.delays else 0.0

    @property
    def mean_queue_wait(self):
        return statistics.mean(self.queue_waits) if self.queue_waits else 0.0

    @property
    def mean_service_time(self):
        return statistics.mean(self.service_times) if self.service_times else 0.0

    @property
    def p95_delay(self):
        if len(self.delays) < 2:
            return self.mean_delay
        s = sorted(self.delays)
        return s[min(int(0.95 * len(s)), len(s) - 1)]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "config": {
                "arrival_rate": self.config.arrival_rate,
                "service_rate": self.config.service_rate,
                "forward_rate": self.config.forward_rate,
                "buffer_size": self.config.buffer_size,
                "num_processors": self.config.num_processors,
                "sim_time": self.config.sim_time,
                "seed": self.config.seed,
            },
            "packets_arrived": self.packets_arrived,
            "packets_delivered": self.packets_delivered,
            "packets_dropped": self.packets_dropped,
            "throughput": round(self.throughput, 4),
            "packet_loss_rate": round(self.packet_loss_rate, 4),
            "mean_delay_ms": round(self.mean_delay * 1000, 4),
            "p95_delay_ms": round(self.p95_delay * 1000, 4),
            "mean_queue_wait_ms": round(self.mean_queue_wait * 1000, 4),
            "mean_service_ms": round(self.mean_service_time * 1000, 4),
            "delays": [round(d * 1000, 2) for d in self.delays],
            "queue_waits": [round(w * 1000, 2) for w in self.queue_waits],
        }


class PetriNetPacketSim:
    """
    Event-driven Petri Net simulation for network packet flow.
    
    Supports two modes:
      - run()       : Run to completion, return SimResults (for REST API)
      - run_steps() : Generator yielding events at each transition (for WebSocket)
    """
    MAX_FWD = 50

    def __init__(self, cfg: SimConfig):
        self.cfg = cfg
        random.seed(cfg.seed)
        self.input_queue: List[Packet] = []
        self.idle_procs: int = cfg.num_processors
        self.output_queue: List[Packet] = []
        self.fwd_slots: int = self.MAX_FWD
        self.clock = 0.0
        self._heap: List = []
        self._seq = 0
        self.results = SimResults(config=cfg)
        self._pid = 0

    def _sched(self, t, etype, data=None):
        heapq.heappush(self._heap, (t, self._seq, etype, data))
        self._seq += 1

    def _exp(self, rate):
        return random.expovariate(rate)

    # ── Transition handlers that collect events ──────────────────

    def _arrive(self, t) -> List[Dict[str, Any]]:
        """T0 (Arrive) or T5 (Drop): P0 → P1 or P0 → P7"""
        events = []
        self._pid += 1
        pkt = Packet(pid=self._pid, arrival_time=t)
        self.results.packets_arrived += 1

        if len(self.input_queue) < self.cfg.buffer_size:
            self.input_queue.append(pkt)
            events.append({
                "type": "arrive",
                "time": round(t, 4),
                "packet_id": pkt.pid,
                "queue_length": len(self.input_queue),
                "dropped": False,
                "total_arrived": self.results.packets_arrived,
                "total_delivered": self.results.packets_delivered,
                "total_dropped": self.results.packets_dropped,
            })
            events.extend(self._try_process(t))
        else:
            pkt.dropped = True
            self.results.packets_dropped += 1
            events.append({
                "type": "drop",
                "time": round(t, 4),
                "packet_id": pkt.pid,
                "queue_length": len(self.input_queue),
                "dropped": True,
                "total_arrived": self.results.packets_arrived,
                "total_delivered": self.results.packets_delivered,
                "total_dropped": self.results.packets_dropped,
            })

        nxt = t + self._exp(self.cfg.arrival_rate)
        if nxt <= self.cfg.sim_time:
            self._sched(nxt, ARRIVE)

        return events

    def _try_process(self, t) -> List[Dict[str, Any]]:
        """T1 (StartProcess): P1+P2 → P3"""
        events = []
        while self.input_queue and self.idle_procs > 0:
            pkt = self.input_queue.pop(0)
            self.idle_procs -= 1
            pkt.service_start = t
            self.results.queue_waits.append(t - pkt.arrival_time)
            self._sched(t + self._exp(self.cfg.service_rate), FINISH_PROCESS, pkt)
            events.append({
                "type": "start_process",
                "time": round(t, 4),
                "packet_id": pkt.pid,
                "queue_length": len(self.input_queue),
                "idle_processors": self.idle_procs,
            })
        return events

    def _finish(self, t, pkt) -> List[Dict[str, Any]]:
        """T2 (FinishProcess): P3 → P2+P4"""
        events = []
        pkt.service_end = t
        self.results.service_times.append(t - pkt.service_start)
        self.idle_procs += 1
        self.output_queue.append(pkt)
        events.append({
            "type": "finish_process",
            "time": round(t, 4),
            "packet_id": pkt.pid,
            "idle_processors": self.idle_procs,
            "output_queue_length": len(self.output_queue),
        })
        events.extend(self._try_process(t))
        events.extend(self._try_forward(t))
        return events

    def _try_forward(self, t) -> List[Dict[str, Any]]:
        """T3 (Forward): P4 → P5"""
        events = []
        while self.output_queue and self.fwd_slots > 0:
            pkt = self.output_queue.pop(0)
            self.fwd_slots -= 1
            pkt.forward_start = t
            self._sched(t + self._exp(self.cfg.forward_rate), DELIVER, pkt)
            events.append({
                "type": "forward",
                "time": round(t, 4),
                "packet_id": pkt.pid,
                "output_queue_length": len(self.output_queue),
            })
        return events

    def _deliver(self, t, pkt) -> List[Dict[str, Any]]:
        """T4 (Deliver): P5 → P6"""
        pkt.deliver_time = t
        self.fwd_slots += 1
        delay = t - pkt.arrival_time
        self.results.delays.append(delay)
        self.results.packets_delivered += 1

        events = [{
            "type": "deliver",
            "time": round(t, 4),
            "packet_id": pkt.pid,
            "delay_ms": round(delay * 1000, 2),
            "total_delivered": self.results.packets_delivered,
            "total_dropped": self.results.packets_dropped,
            "total_arrived": self.results.packets_arrived,
            "throughput": round(self.results.packets_delivered / t, 4) if t > 0 else 0,
            "loss_rate": round(self.results.packet_loss_rate, 4),
            "mean_delay_ms": round(self.results.mean_delay * 1000, 2),
        }]
        events.extend(self._try_forward(t))
        return events

    # ── Run modes ────────────────────────────────────────────────

    def run(self) -> SimResults:
        """Run simulation to completion. Returns aggregate results."""
        self._sched(self._exp(self.cfg.arrival_rate), ARRIVE)
        while self._heap:
            t, _, etype, data = heapq.heappop(self._heap)
            if t > self.cfg.sim_time:
                break
            self.clock = t
            if etype == ARRIVE:
                self._arrive(t)
            elif etype == FINISH_PROCESS:
                self._finish(t, data)
            elif etype == DELIVER:
                self._deliver(t, data)
        return self.results

    def run_steps(self) -> Generator[List[Dict[str, Any]], None, SimResults]:
        """
        Generator that yields a list of events for each simulation step.
        Each step corresponds to one heap event (which may trigger cascading transitions).
        """
        self._sched(self._exp(self.cfg.arrival_rate), ARRIVE)
        while self._heap:
            t, _, etype, data = heapq.heappop(self._heap)
            if t > self.cfg.sim_time:
                break
            self.clock = t
            events = []
            if etype == ARRIVE:
                events = self._arrive(t)
            elif etype == FINISH_PROCESS:
                events = self._finish(t, data)
            elif etype == DELIVER:
                events = self._deliver(t, data)

            if events:
                yield events

        return self.results


def run_batch(cfg: SimConfig) -> SimResults:
    """Convenience function to run a single simulation to completion."""
    return PetriNetPacketSim(cfg).run()


def run_experiment(arrival_rates, buffer_sizes, service_rate=6.0,
                   forward_rate=10.0, num_processors=1, sim_time=500.0,
                   seeds=None) -> List[Dict[str, Any]]:
    """
    Run a factorial experiment over arrival_rates × buffer_sizes.
    Returns list of result dictionaries.
    """
    if seeds is None:
        seeds = [42, 137, 271]

    results = []
    for buf in buffer_sizes:
        for lam in arrival_rates:
            reps = []
            for s in seeds:
                cfg = SimConfig(
                    arrival_rate=lam, service_rate=service_rate,
                    forward_rate=forward_rate, buffer_size=buf,
                    num_processors=num_processors, sim_time=sim_time, seed=s
                )
                reps.append(PetriNetPacketSim(cfg).run())
            # Average across seeds
            avg_arrived = int(statistics.mean(r.packets_arrived for r in reps))
            avg_delivered = int(statistics.mean(r.packets_delivered for r in reps))
            avg_dropped = int(statistics.mean(r.packets_dropped for r in reps))
            all_delays = [d for r in reps for d in r.delays]
            all_waits = [w for r in reps for w in r.queue_waits]
            all_service = [s for r in reps for s in r.service_times]

            avg_throughput = statistics.mean(r.throughput for r in reps)
            avg_loss = statistics.mean(r.packet_loss_rate for r in reps)
            avg_delay = statistics.mean(all_delays) if all_delays else 0.0
            avg_wait = statistics.mean(all_waits) if all_waits else 0.0
            avg_svc = statistics.mean(all_service) if all_service else 0.0

            sorted_delays = sorted(all_delays)
            p95 = sorted_delays[min(int(0.95 * len(sorted_delays)), len(sorted_delays) - 1)] if sorted_delays else 0.0

            results.append({
                "arrival_rate": lam,
                "buffer_size": buf,
                "service_rate": service_rate,
                "packets_arrived": avg_arrived,
                "packets_delivered": avg_delivered,
                "packets_dropped": avg_dropped,
                "throughput": round(avg_throughput, 4),
                "loss_rate_pct": round(avg_loss * 100, 4),
                "mean_delay_ms": round(avg_delay * 1000, 4),
                "p95_delay_ms": round(p95 * 1000, 4),
                "mean_queue_wait_ms": round(avg_wait * 1000, 4),
                "mean_service_ms": round(avg_svc * 1000, 4),
            })

    return results
