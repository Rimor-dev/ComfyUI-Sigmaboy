import torch
import numpy as np
from comfy_api.latest import ComfyExtension, io

try:
    from server import PromptServer
except ImportError:
    PromptServer = None


# ============================================================
# 16-STEP PROFILES
# ============================================================
SIGMAS_SOFT_16 = np.array([
    1.0000, 0.9999, 0.9998, 0.9997, 0.9995, 0.9992, 0.9987, 0.9978,
    0.9963, 0.9936, 0.9888, 0.9801, 0.9640, 0.9345, 0.8785, 0.7600, 0.0
], dtype=np.float32)

SIGMAS_BASE_16 = np.array([
    1.0000, 0.9999, 0.9998, 0.9996, 0.9993, 0.9988, 0.9979, 0.9963,
    0.9936, 0.9885, 0.9788, 0.9600, 0.9230, 0.8550, 0.7300, 0.5000, 0.0
], dtype=np.float32)

SIGMAS_HARD_16 = np.array([
    1.0000, 0.9998, 0.9995, 0.9988, 0.9975, 0.9950, 0.9900, 0.9800,
    0.9600, 0.9250, 0.8650, 0.7700, 0.6300, 0.4500, 0.2500, 0.0800, 0.0
], dtype=np.float32)


# ============================================================
# ИНТЕРПОЛЯЦИЯ (та же логика, что в 8-шаговом)
# ============================================================
def interpolate_sigmas(aggression, soft, base, hard):
    """Интерполяция между SOFT / BASE / HARD."""
    if aggression <= 1.0:
        t = (aggression - 0.1) / (1.0 - 0.1)
        t = max(0.0, min(1.0, t))
        return soft + (base - soft) * t
    else:
        t = (aggression - 1.0) / (3.0 - 1.0)
        t = max(0.0, min(1.0, t))
        return base + (hard - base) * t


class SigmaboyTurbo16(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_SigmaboyTurbo16",
            display_name="Sigmaboy Turbo 16",
            category="Rimor_dev/schedulers",
            description="Sigma scheduler for 16-step models (HiDream Fast, etc). "
                        "One slider: BASE → HARD. "
                        "Interpolation between 3 reference profiles.",
            inputs=[
                io.Float.Input(
                    "aggression", default=1.0, min=1.0, max=3.0, step=0.01,
                    display_name="Aggression",
                    tooltip="1.0 = base profile. >1.0 more aggressive."
                ),
                io.String.Input(
                    "node_id_hidden", default="0",
                    socketless=True, extra_dict={"hidden": True}
                ),
            ],
            outputs=[
                io.Sigmas.Output(display_name="sigmas"),
            ],
        )

    @classmethod
    def execute(cls, aggression, node_id_hidden=None, unique_id=None, **kwargs) -> io.NodeOutput:
        sigmas_np = interpolate_sigmas(
            aggression,
            SIGMAS_SOFT_16,
            SIGMAS_BASE_16,
            SIGMAS_HARD_16
        )
        sigmas = torch.from_numpy(sigmas_np).float()

        print(f"\033[92m[Sigmaboy Turbo 16]\033[0m "
              f"16 steps | aggression: {aggression:.2f} | "
              f"sigmas: {[round(float(s), 4) for s in sigmas_np]}")

        if PromptServer is not None:
            try:
                node_id = None
                if node_id_hidden is not None and node_id_hidden != "0":
                    node_id = node_id_hidden
                elif unique_id is not None:
                    node_id = str(unique_id)

                if node_id is not None:
                    client_id = getattr(PromptServer.instance, 'client_id', None)
                    if client_id is not None:
                        PromptServer.instance.send_sync(
                            "sigmaboy16_status",
                            {
                                "node_id": str(node_id),
                                "aggression": float(aggression),
                            },
                            client_id
                        )
            except Exception:
                pass

        return io.NodeOutput(sigmas)

    get_sigmas = execute