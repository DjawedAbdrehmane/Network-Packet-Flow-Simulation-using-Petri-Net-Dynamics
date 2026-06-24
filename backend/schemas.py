"""
Pydantic schemas for the Network Packet Flow Simulation API.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class SimConfigSchema(BaseModel):
    """Simulation configuration parameters."""
    arrival_rate: float = Field(5.0, ge=0.1, le=50.0, description="Packet arrival rate λ (pkt/s)")
    service_rate: float = Field(6.0, ge=0.1, le=50.0, description="Service rate μ (pkt/s)")
    forward_rate: float = Field(10.0, ge=0.1, le=100.0, description="Forward channel rate (pkt/s)")
    buffer_size: int = Field(10, ge=1, le=200, description="Input queue buffer capacity")
    num_processors: int = Field(1, ge=1, le=10, description="Number of parallel processors")
    sim_time: float = Field(200.0, ge=10.0, le=5000.0, description="Total simulation time (seconds)")
    seed: int = Field(42, ge=0, description="Random seed for reproducibility")


class SimResultSchema(BaseModel):
    """Aggregate simulation results."""
    config: SimConfigSchema
    packets_arrived: int
    packets_delivered: int
    packets_dropped: int
    throughput: float
    packet_loss_rate: float
    mean_delay_ms: float
    p95_delay_ms: float
    mean_queue_wait_ms: float
    mean_service_ms: float
    delays: List[float] = Field(default_factory=list, description="All end-to-end delays (ms)")
    queue_waits: List[float] = Field(default_factory=list, description="All queue wait times (ms)")


class SimEventSchema(BaseModel):
    """A single simulation event for real-time streaming."""
    type: str  # arrive, drop, start_process, finish_process, forward, deliver, done
    time: float
    packet_id: Optional[int] = None
    queue_length: Optional[int] = None
    output_queue_length: Optional[int] = None
    idle_processors: Optional[int] = None
    dropped: Optional[bool] = None
    total_arrived: Optional[int] = None
    total_delivered: Optional[int] = None
    total_dropped: Optional[int] = None
    delay_ms: Optional[float] = None
    # Aggregated metrics snapshot (sent periodically)
    throughput: Optional[float] = None
    loss_rate: Optional[float] = None
    mean_delay_ms: Optional[float] = None


class ExperimentConfigSchema(BaseModel):
    """Configuration for batch factorial experiment."""
    arrival_rates: List[float] = Field(default=[2.0, 4.0, 5.5, 6.0, 7.0, 8.0, 10.0])
    buffer_sizes: List[int] = Field(default=[5, 10, 20, 50])
    service_rate: float = Field(6.0, ge=0.1, le=50.0)
    forward_rate: float = Field(10.0, ge=0.1, le=100.0)
    num_processors: int = Field(1, ge=1, le=10)
    sim_time: float = Field(500.0, ge=10.0, le=5000.0)
    seeds: List[int] = Field(default=[42, 137, 271])


class ExperimentRowSchema(BaseModel):
    """A single row from experiment results."""
    arrival_rate: float
    buffer_size: int
    service_rate: float
    packets_arrived: int
    packets_delivered: int
    packets_dropped: int
    throughput: float
    loss_rate_pct: float
    mean_delay_ms: float
    p95_delay_ms: float
    mean_queue_wait_ms: float
    mean_service_ms: float


class WSControlMessage(BaseModel):
    """Control messages from the frontend WebSocket client."""
    action: str  # start, pause, resume, step, set_speed, stop
    config: Optional[SimConfigSchema] = None
    speed: Optional[float] = None
