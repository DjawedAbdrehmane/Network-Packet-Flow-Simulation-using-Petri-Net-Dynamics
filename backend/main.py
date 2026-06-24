"""
FastAPI backend for the Network Packet Flow Simulation.

Endpoints:
  POST /api/simulate      — Run simulation to completion, return aggregate results
  POST /api/experiment     — Run factorial experiment across multiple configs
  WS   /ws/simulate        — Stream simulation events in real-time
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    SimConfigSchema,
    SimResultSchema,
    ExperimentConfigSchema,
    ExperimentRowSchema,
)
from simulation_engine import PetriNetPacketSim, SimConfig, run_experiment

app = FastAPI(
    title="Network Packet Flow Simulation",
    description="Petri Net based network simulation API",
    version="1.0.0",
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_sim_config(schema: SimConfigSchema) -> SimConfig:
    """Convert Pydantic schema to simulation dataclass."""
    return SimConfig(
        arrival_rate=schema.arrival_rate,
        service_rate=schema.service_rate,
        forward_rate=schema.forward_rate,
        buffer_size=schema.buffer_size,
        num_processors=schema.num_processors,
        sim_time=schema.sim_time,
        seed=schema.seed,
    )


# ─── REST Endpoints ──────────────────────────────────────────────────


@app.post("/api/simulate")
async def simulate(config: SimConfigSchema):
    """Run a single simulation to completion and return aggregate results."""
    cfg = _to_sim_config(config)
    sim = PetriNetPacketSim(cfg)
    results = sim.run()
    return results.to_dict()


@app.post("/api/experiment")
async def experiment(config: ExperimentConfigSchema):
    """Run a factorial experiment over arrival_rates × buffer_sizes."""
    rows = run_experiment(
        arrival_rates=config.arrival_rates,
        buffer_sizes=config.buffer_sizes,
        service_rate=config.service_rate,
        forward_rate=config.forward_rate,
        num_processors=config.num_processors,
        sim_time=config.sim_time,
        seeds=config.seeds,
    )
    return {"results": rows}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "petri-net-sim"}


# ─── WebSocket: Real-time Simulation Streaming ───────────────────────


@app.websocket("/ws/simulate")
async def ws_simulate(websocket: WebSocket):
    """
    WebSocket endpoint for real-time simulation streaming.
    
    Protocol:
      Client sends: { "action": "start", "config": { ... } }
      Server streams: { "type": "arrive|drop|start_process|...", ... }
      Client can send: { "action": "pause" | "resume" | "step" | "stop" | "set_speed" }
    """
    await websocket.accept()

    sim = None
    gen = None
    running = False
    paused = False
    stepping = False
    speed = 1.0  # multiplier: higher = faster
    base_delay = 0.08  # base delay between events in seconds

    try:
        while True:
            # Check for incoming control messages (non-blocking when sim is running)
            if running and not paused:
                try:
                    raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                    msg = json.loads(raw)
                    action = msg.get("action", "")

                    if action == "pause":
                        paused = True
                        continue
                    elif action == "stop":
                        running = False
                        await websocket.send_json({"type": "stopped"})
                        continue
                    elif action == "set_speed":
                        speed = float(msg.get("speed", 1.0))
                        continue
                except asyncio.TimeoutError:
                    pass

                # Emit next batch of events
                if gen is not None:
                    try:
                        events = next(gen)
                        for event in events:
                            await websocket.send_json(event)
                        # Throttle based on speed
                        delay = base_delay / speed
                        await asyncio.sleep(delay)
                    except StopIteration:
                        # Simulation complete
                        running = False
                        if sim is not None:
                            summary = sim.results.to_dict()
                            await websocket.send_json({
                                "type": "done",
                                "summary": summary,
                            })
            else:
                # Blocking wait for control messages
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                action = msg.get("action", "")

                if action == "start":
                    config_data = msg.get("config", {})
                    schema = SimConfigSchema(**config_data)
                    cfg = _to_sim_config(schema)
                    sim = PetriNetPacketSim(cfg)
                    gen = sim.run_steps()
                    running = True
                    paused = False
                    stepping = False
                    speed = msg.get("speed", 1.0)
                    await websocket.send_json({"type": "started", "config": config_data})

                elif action == "resume":
                    paused = False

                elif action == "step":
                    # Execute one step then re-pause
                    if gen is not None:
                        try:
                            events = next(gen)
                            for event in events:
                                await websocket.send_json(event)
                        except StopIteration:
                            running = False
                            if sim is not None:
                                summary = sim.results.to_dict()
                                await websocket.send_json({
                                    "type": "done",
                                    "summary": summary,
                                })
                    paused = True

                elif action == "set_speed":
                    speed = float(msg.get("speed", 1.0))

                elif action == "stop":
                    running = False
                    sim = None
                    gen = None
                    await websocket.send_json({"type": "stopped"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
