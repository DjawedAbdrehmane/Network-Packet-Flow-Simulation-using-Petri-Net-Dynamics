"""
plot_results.py — Generates 6 analysis figures from experiment_results.csv
"""
import csv, os, random
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from simulation import PetriNetPacketSim, SimConfig

plt.rcParams.update({
    "figure.dpi": 150, "font.family": "DejaVu Sans",
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.alpha": 0.3, "lines.linewidth": 2,
})
COLORS  = ["#1565C0","#C62828","#2E7D32","#E65100","#6A1B9A","#00838F"]
MARKERS = ["o","s","^","D","v","P"]
os.makedirs("results/plots", exist_ok=True)

def load():
    rows = []
    with open("results/experiment_results.csv") as f:
        for row in csv.DictReader(f):
            rows.append({k: float(v) for k,v in row.items()})
    return rows

def groups(rows):
    g = {}
    for r in rows:
        b = int(r["buffer_size"])
        g.setdefault(b,[]).append(r)
    for b in g: g[b].sort(key=lambda x:x["arrival_rate"])
    return g

def sv(fig, name):
    fig.savefig(f"results/plots/{name}", bbox_inches="tight")
    plt.close(fig)
    print(f"  → results/plots/{name}")

# ── 1 Throughput ──────────────────────────────────────────────────────
def p1(g):
    fig,ax = plt.subplots(figsize=(8,5))
    for i,(buf,rows) in enumerate(sorted(g.items())):
        ax.plot([r["arrival_rate"] for r in rows],[r["throughput"] for r in rows],
                color=COLORS[i%6],marker=MARKERS[i%6],label=f"Buffer {buf}")
    ax.axhline(6.0,ls="--",color="gray",alpha=0.7,label="μ = 6 pkt/s (capacity)")
    ax.set_xlabel("Arrival Rate λ (pkt/s)"); ax.set_ylabel("Throughput (pkt/s)")
    ax.set_title("Throughput vs Arrival Rate"); ax.legend(fontsize=9)
    sv(fig,"01_throughput.png")

# ── 2 Packet Loss ─────────────────────────────────────────────────────
def p2(g):
    fig,ax = plt.subplots(figsize=(8,5))
    for i,(buf,rows) in enumerate(sorted(g.items())):
        ax.plot([r["arrival_rate"] for r in rows],[r["loss_rate_pct"] for r in rows],
                color=COLORS[i%6],marker=MARKERS[i%6],label=f"Buffer {buf}")
    ax.set_xlabel("Arrival Rate λ (pkt/s)"); ax.set_ylabel("Packet Loss (%)")
    ax.set_title("Packet Loss Rate vs Arrival Rate"); ax.legend(fontsize=9)
    sv(fig,"02_packet_loss.png")

# ── 3 Mean Delay ──────────────────────────────────────────────────────
def p3(g):
    fig,ax = plt.subplots(figsize=(8,5))
    for i,(buf,rows) in enumerate(sorted(g.items())):
        ax.plot([r["arrival_rate"] for r in rows],[r["mean_delay_ms"] for r in rows],
                color=COLORS[i%6],marker=MARKERS[i%6],label=f"Buffer {buf}")
    ax.set_xlabel("Arrival Rate λ (pkt/s)"); ax.set_ylabel("Mean E2E Delay (ms)")
    ax.set_title("Mean End-to-End Delay vs Arrival Rate"); ax.legend(fontsize=9)
    sv(fig,"03_mean_delay.png")

# ── 4 Heatmap ─────────────────────────────────────────────────────────
def p4(rows):
    lams   = sorted(set(r["arrival_rate"] for r in rows))
    bufs   = sorted(set(int(r["buffer_size"]) for r in rows))
    lkp    = {(int(r["buffer_size"]),r["arrival_rate"]):r["loss_rate_pct"] for r in rows}
    mat    = np.array([[lkp.get((b,l),0) for l in lams] for b in bufs])
    fig,ax = plt.subplots(figsize=(10,4))
    im     = ax.imshow(mat,aspect="auto",cmap="YlOrRd",vmin=0,vmax=min(mat.max(),60))
    ax.set_xticks(range(len(lams))); ax.set_xticklabels([f"{l}" for l in lams])
    ax.set_yticks(range(len(bufs))); ax.set_yticklabels([str(b) for b in bufs])
    ax.set_xlabel("Arrival Rate λ (pkt/s)"); ax.set_ylabel("Buffer Size")
    ax.set_title("Heatmap: Packet Loss Rate (%) — λ × Buffer Size")
    plt.colorbar(im,ax=ax,label="Loss (%)")
    for bi in range(len(bufs)):
        for li in range(len(lams)):
            ax.text(li,bi,f"{mat[bi,li]:.1f}",ha="center",va="center",
                    fontsize=7,color="black" if mat[bi,li]<30 else "white")
    sv(fig,"04_loss_heatmap.png")

# ── 5 Delay CDF ───────────────────────────────────────────────────────
def p5():
    cfgs   = [(4.0,10,"λ=4 buf=10"),(5.5,10,"λ=5.5 buf=10"),
              (7.0,10,"λ=7 buf=10"),(7.0,50,"λ=7 buf=50")]
    fig,ax = plt.subplots(figsize=(8,5))
    for i,(lam,buf,lbl) in enumerate(cfgs):
        r  = PetriNetPacketSim(SimConfig(arrival_rate=lam,buffer_size=buf,sim_time=500,seed=42)).run()
        xs = sorted(d*1000 for d in r.delays)
        ys = [(j+1)/len(xs) for j in range(len(xs))]
        ax.plot(xs,ys,color=COLORS[i],label=lbl)
    ax.set_xlabel("End-to-End Delay (ms)"); ax.set_ylabel("CDF")
    ax.set_title("Delay CDF — Selected Configurations"); ax.legend(fontsize=9)
    sv(fig,"05_delay_cdf.png")

# ── 6 Queue Wait ──────────────────────────────────────────────────────
def p6(g):
    fig,ax = plt.subplots(figsize=(8,5))
    for i,(buf,rows) in enumerate(sorted(g.items())):
        ax.plot([r["arrival_rate"] for r in rows],[r["mean_queue_wait_ms"] for r in rows],
                color=COLORS[i%6],marker=MARKERS[i%6],label=f"Buffer {buf}")
    ax.set_xlabel("Arrival Rate λ (pkt/s)"); ax.set_ylabel("Mean Queue Wait (ms)")
    ax.set_title("Mean Queue Wait vs Arrival Rate"); ax.legend(fontsize=9)
    sv(fig,"06_queue_wait.png")

if __name__ == "__main__":
    print("Generating plots …")
    rows = load(); g = groups(rows)
    p1(g); p2(g); p3(g); p4(rows); p5(); p6(g)
    print("All plots saved to results/plots/")
