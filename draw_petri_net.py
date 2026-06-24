"""
draw_petri_net.py — Renders the Petri Net diagram for the simulation
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch
import numpy as np, os
os.makedirs("results/plots", exist_ok=True)

fig, ax = plt.subplots(figsize=(16, 7))
ax.set_xlim(-0.5, 15.5); ax.set_ylim(-1.5, 5)
ax.axis("off")
ax.set_facecolor("#FAFAFA"); fig.patch.set_facecolor("#FAFAFA")

PC = "#1565C0"  # place color
TC = "#E65100"  # transition color
DC = "#2E7D32"  # dropped color

# ── Places: (x, y, name, label, color) ──────────────────────────────
places = [
    (0.5, 2.0, "P0", "Packet\nSource",    PC),
    (3.0, 3.5, "P1", "Input\nQueue\n[buf]",PC),
    (3.0, 0.5, "P2", "Processor\nIdle",   PC),
    (6.0, 2.0, "P3", "Processing",        PC),
    (9.0, 2.0, "P4", "Output\nQueue",     PC),
    (11.5,3.5, "P5", "Forward\nChannel",  PC),
    (14.0,2.0, "P6", "Delivered\n(Sink)", PC),
    (3.0,-0.8, "P7", "Dropped\n(Sink)",   DC),
]

# ── Transitions: (x, y, name, label) ────────────────────────────────
transitions = [
    (1.8,  3.5, "T0", "Arrive"),
    (1.8,  0.0, "T5", "Drop"),
    (4.5,  2.0, "T1", "Start\nProcess"),
    (7.5,  2.0, "T2", "Finish\nProcess"),
    (10.5, 3.5, "T3", "Forward"),
    (12.8, 2.0, "T4", "Deliver"),
]

def draw_place(ax, x, y, name, label, color):
    circ = plt.Circle((x, y), 0.55, color=color, ec="white", lw=2, zorder=3)
    ax.add_patch(circ)
    ax.text(x, y+0.05, name, ha="center", va="center",
            fontsize=10, fontweight="bold", color="white", zorder=4)
    ax.text(x, y-0.85, label, ha="center", va="top",
            fontsize=7.5, color="#333333", zorder=4, style="italic")

def draw_transition(ax, x, y, name, label):
    rect = mpatches.FancyBboxPatch((x-0.35, y-0.55), 0.7, 1.1,
        boxstyle="round,pad=0.05", color=TC, ec="white", lw=2, zorder=3)
    ax.add_patch(rect)
    ax.text(x, y+0.05, name, ha="center", va="center",
            fontsize=10, fontweight="bold", color="white", zorder=4)
    ax.text(x, y-0.75, label, ha="center", va="top",
            fontsize=7.5, color="#555555", zorder=4)

def arrow(ax, x1, y1, x2, y2, color="#555555"):
    ax.annotate("", xy=(x2,y2), xytext=(x1,y1),
        arrowprops=dict(arrowstyle="-|>", color=color,
                        lw=1.8, mutation_scale=15), zorder=2)

for (x,y,n,l,c) in places:
    draw_place(ax, x, y, n, l, c)
for (x,y,n,l) in transitions:
    draw_transition(ax, x, y, n, l)

# ── Arcs ─────────────────────────────────────────────────────────────
# P0 → T0
arrow(ax, 0.5+0.55, 2.0, 1.8-0.35, 3.5-0.2)
# P0 → T5
arrow(ax, 0.5+0.55, 2.0, 1.8-0.35, 0.0+0.2)
# T0 → P1
arrow(ax, 1.8+0.35, 3.5, 3.0-0.55, 3.5)
# T5 → P7
arrow(ax, 1.8+0.35, 0.0, 3.0-0.55, -0.8, color=DC)
# P1 → T1
arrow(ax, 3.0+0.55, 3.5, 4.5-0.35, 2.0+0.3)
# P2 → T1
arrow(ax, 3.0+0.55, 0.5, 4.5-0.35, 2.0-0.3)
# T1 → P3
arrow(ax, 4.5+0.35, 2.0, 6.0-0.55, 2.0)
# P3 → T2
arrow(ax, 6.0+0.55, 2.0, 7.5-0.35, 2.0)
# T2 → P2  (arc going down-left)
arrow(ax, 7.5-0.1, 2.0-0.55, 3.0+0.55, 0.5+0.2)
# T2 → P4
arrow(ax, 7.5+0.35, 2.0, 9.0-0.55, 2.0)
# P4 → T3
arrow(ax, 9.0+0.55, 2.0+0.3, 10.5-0.35, 3.5-0.2)
# T3 → P5
arrow(ax, 10.5+0.35, 3.5, 11.5-0.55, 3.5)
# P5 → T4
arrow(ax, 11.5+0.55, 3.5-0.3, 12.8-0.35, 2.0+0.3)
# T4 → P6
arrow(ax, 12.8+0.35, 2.0, 14.0-0.55, 2.0)

# ── Guard annotation ─────────────────────────────────────────────────
ax.text(1.15, 4.1, "|P1|<buf", fontsize=8, color=PC, style="italic")
ax.text(0.85,-0.25, "|P1|=buf", fontsize=8, color=DC, style="italic")

# ── Token (dot in P2) ─────────────────────────────────────────────────
ax.plot(3.0, 0.5, "o", ms=9, color="white", zorder=5)

ax.set_title("Petri Net Model — Network Packet Flow Simulation",
             fontsize=14, fontweight="bold", pad=14)

legend = [mpatches.Patch(color=PC, label="Place (P)"),
          mpatches.Patch(color=TC, label="Transition (T)"),
          mpatches.Patch(color=DC, label="Drop / Sink")]
ax.legend(handles=legend, loc="lower right", fontsize=9, framealpha=0.8)

fig.savefig("results/plots/00_petri_net.png", bbox_inches="tight", dpi=160)
plt.close(fig)
print("  → results/plots/00_petri_net.png")
