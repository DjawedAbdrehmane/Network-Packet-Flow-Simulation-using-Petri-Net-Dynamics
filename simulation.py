"""
Network Packet Flow Simulation using Petri Net Dynamics
========================================================
Course: Modeling and Simulation
Topic:  Network Packet Flow — Arrival, Queuing, Processing, Forwarding

Petri Net Structure
───────────────────
Places (P):
  P0 - PacketSource   : token = next arriving packet
  P1 - InputQueue     : packets waiting to be processed  [BOUNDED: buffer_size]
  P2 - ProcessorIdle  : tokens = number of free processors
  P3 - Processing     : packet currently being processed
  P4 - OutputQueue    : processed packets waiting forwarding
  P5 - ForwardChannel : packet being forwarded
  P6 - Delivered      : delivered packets (sink / counter)
  P7 - Dropped        : packets dropped due to P1 overflow (counter)

Transitions (T):
  T0 - Arrive        : P0 → P1        if |P1| < buffer_size
  T5 - Drop          : P0 → P7        if |P1| = buffer_size
  T1 - StartProcess  : P1+P2 → P3     (processor picks up head-of-queue)
  T2 - FinishProcess : P3 → P2+P4     (processing done; processor freed)
  T3 - Forward       : P4 → P5        (packet enters forwarding channel)
  T4 - Deliver       : P5 → P6        (packet reaches destination)
"""

import heapq, random, statistics, csv, os
from dataclasses import dataclass, field
from typing import List

ARRIVE = "ARRIVE"
FINISH_PROCESS = "FINISH_PROCESS"
DELIVER = "DELIVER"


@dataclass
class Packet:
    pid: int
    arrival_time:  float = 0.0
    service_start: float = 0.0
    service_end:   float = 0.0
    forward_start: float = 0.0
    deliver_time:  float = 0.0
    dropped: bool = False


@dataclass
class SimConfig:
    arrival_rate:   float = 5.0
    service_rate:   float = 6.0
    forward_rate:   float = 10.0
    buffer_size:    int   = 10
    num_processors: int   = 1
    sim_time:       float = 200.0
    seed:           int   = 42


@dataclass
class SimResults:
    config:            SimConfig
    packets_arrived:   int = 0
    packets_delivered: int = 0
    packets_dropped:   int = 0
    delays:       List[float] = field(default_factory=list)
    queue_waits:  List[float] = field(default_factory=list)
    service_times:List[float] = field(default_factory=list)

    @property
    def throughput(self):
        return self.packets_delivered / self.config.sim_time

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
        return s[min(int(0.95*len(s)), len(s)-1)]

    def summary(self):
        return "\n".join([
            f"  λ={self.config.arrival_rate:.1f}  μ={self.config.service_rate:.1f}  buf={self.config.buffer_size}",
            f"  Arrived   : {self.packets_arrived}",
            f"  Delivered : {self.packets_delivered}",
            f"  Dropped   : {self.packets_dropped}",
            f"  Throughput: {self.throughput:.3f} pkt/s",
            f"  Loss Rate : {self.packet_loss_rate*100:.2f}%",
            f"  Mean Delay: {self.mean_delay*1000:.3f} ms",
            f"  P95  Delay: {self.p95_delay*1000:.3f} ms",
            f"  Mean Queue: {self.mean_queue_wait*1000:.3f} ms",
        ])


class PetriNetPacketSim:
    MAX_FWD = 50

    def __init__(self, cfg: SimConfig):
        self.cfg = cfg
        random.seed(cfg.seed)
        self.input_queue:  List[Packet] = []
        self.idle_procs:   int = cfg.num_processors
        self.output_queue: List[Packet] = []
        self.fwd_slots:    int = self.MAX_FWD
        self.clock = 0.0
        self._heap: List = []
        self._seq  = 0
        self.results = SimResults(config=cfg)
        self._pid = 0

    def _sched(self, t, etype, data=None):
        heapq.heappush(self._heap, (t, self._seq, etype, data))
        self._seq += 1

    def _exp(self, rate):
        return random.expovariate(rate)

    def _arrive(self, t):
        self._pid += 1
        pkt = Packet(pid=self._pid, arrival_time=t)
        self.results.packets_arrived += 1
        if len(self.input_queue) < self.cfg.buffer_size:
            self.input_queue.append(pkt)
            self._try_process(t)
        else:
            pkt.dropped = True
            self.results.packets_dropped += 1
        nxt = t + self._exp(self.cfg.arrival_rate)
        if nxt <= self.cfg.sim_time:
            self._sched(nxt, ARRIVE)

    def _try_process(self, t):
        while self.input_queue and self.idle_procs > 0:
            pkt = self.input_queue.pop(0)
            self.idle_procs -= 1
            pkt.service_start = t
            self.results.queue_waits.append(t - pkt.arrival_time)
            self._sched(t + self._exp(self.cfg.service_rate), FINISH_PROCESS, pkt)

    def _finish(self, t, pkt):
        pkt.service_end = t
        self.results.service_times.append(t - pkt.service_start)
        self.idle_procs += 1
        self.output_queue.append(pkt)
        self._try_process(t)
        self._try_forward(t)

    def _try_forward(self, t):
        while self.output_queue and self.fwd_slots > 0:
            pkt = self.output_queue.pop(0)
            self.fwd_slots -= 1
            pkt.forward_start = t
            self._sched(t + self._exp(self.cfg.forward_rate), DELIVER, pkt)

    def _deliver(self, t, pkt):
        pkt.deliver_time = t
        self.fwd_slots += 1
        self.results.delays.append(t - pkt.arrival_time)
        self.results.packets_delivered += 1
        self._try_forward(t)

    def run(self) -> SimResults:
        self._sched(self._exp(self.cfg.arrival_rate), ARRIVE)
        while self._heap:
            t, _, etype, data = heapq.heappop(self._heap)
            if t > self.cfg.sim_time:
                break
            self.clock = t
            if   etype == ARRIVE:         self._arrive(t)
            elif etype == FINISH_PROCESS: self._finish(t, data)
            elif etype == DELIVER:        self._deliver(t, data)
        return self.results


def run_experiment(arrival_rates, buffer_sizes, base_cfg, seeds=None):
    if seeds is None:
        seeds = [42, 137, 271]
    all_results = []
    for buf in buffer_sizes:
        for lam in arrival_rates:
            reps = []
            for s in seeds:
                cfg = SimConfig(arrival_rate=lam, service_rate=base_cfg.service_rate,
                                forward_rate=base_cfg.forward_rate, buffer_size=buf,
                                num_processors=base_cfg.num_processors,
                                sim_time=base_cfg.sim_time, seed=s)
                reps.append(PetriNetPacketSim(cfg).run())
            all_results.append(_avg(reps, base_cfg, lam, buf))
    return all_results


def _avg(reps, base_cfg, lam, buf):
    cfg = SimConfig(arrival_rate=lam, service_rate=base_cfg.service_rate,
                    forward_rate=base_cfg.forward_rate, buffer_size=buf,
                    num_processors=base_cfg.num_processors, sim_time=base_cfg.sim_time)
    avg = SimResults(config=cfg)
    avg.packets_arrived   = int(statistics.mean(r.packets_arrived   for r in reps))
    avg.packets_delivered = int(statistics.mean(r.packets_delivered for r in reps))
    avg.packets_dropped   = int(statistics.mean(r.packets_dropped   for r in reps))
    avg.delays        = [d for r in reps for d in r.delays]
    avg.queue_waits   = [w for r in reps for w in r.queue_waits]
    avg.service_times = [s for r in reps for s in r.service_times]
    return avg


def export_csv(results, path):
    fields = ["arrival_rate","buffer_size","service_rate","packets_arrived",
              "packets_delivered","packets_dropped","throughput","loss_rate_pct",
              "mean_delay_ms","p95_delay_ms","mean_queue_wait_ms","mean_service_ms"]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in results:
            w.writerow({"arrival_rate": r.config.arrival_rate,
                        "buffer_size": r.config.buffer_size,
                        "service_rate": r.config.service_rate,
                        "packets_arrived": r.packets_arrived,
                        "packets_delivered": r.packets_delivered,
                        "packets_dropped": r.packets_dropped,
                        "throughput": round(r.throughput,4),
                        "loss_rate_pct": round(r.packet_loss_rate*100,4),
                        "mean_delay_ms": round(r.mean_delay*1000,4),
                        "p95_delay_ms": round(r.p95_delay*1000,4),
                        "mean_queue_wait_ms": round(r.mean_queue_wait*1000,4),
                        "mean_service_ms": round(r.mean_service_time*1000,4)})
    print(f"  → CSV: {path}")


if __name__ == "__main__":
    os.makedirs("results", exist_ok=True)
    print("="*62)
    print("  Network Packet Flow — Petri Net Simulation")
    print("="*62)

    print("\n[1] Single-run demo (λ=5, μ=6, buffer=10, T=200 s)")
    res = PetriNetPacketSim(SimConfig()).run()
    print(res.summary())

    print("\n[2] Full factorial experiment …")
    arrival_rates = [2.0, 4.0, 5.5, 6.0, 7.0, 8.0, 10.0]
    buffer_sizes  = [5, 10, 20, 50]
    base = SimConfig(service_rate=6.0, forward_rate=10.0, num_processors=1, sim_time=500.0)
    all_res = run_experiment(arrival_rates, buffer_sizes, base, seeds=[42,137,271,999,2025])
    export_csv(all_res, "results/experiment_results.csv")

    hdr = f"{'λ':>5} {'Buffer':>7} {'Thruput':>10} {'Loss%':>8} {'Delay(ms)':>11} {'P95(ms)':>9}"
    print("\n" + hdr)
    print("-"*len(hdr))
    for r in all_res:
        print(f"{r.config.arrival_rate:>5.1f} {r.config.buffer_size:>7} "
              f"{r.throughput:>10.3f} {r.packet_loss_rate*100:>8.2f} "
              f"{r.mean_delay*1000:>11.3f} {r.p95_delay*1000:>9.3f}")
    print("\nDone. Run plot_results.py for charts.")
