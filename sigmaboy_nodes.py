import torch
import numpy as np
from comfy_api.latest import ComfyExtension, io

try:
    from server import PromptServer
except ImportError:
    PromptServer = None


# ============================================================
# ЭТАЛОННЫЕ РЯДЫ СИГМ
# ============================================================
SIGMAS_SOFT = np.array([
    1.0, 0.9998, 0.9988, 0.9950, 0.9835,
    0.9500, 0.8650, 0.6350, 0.0
], dtype=np.float32)

SIGMAS_BASE = np.array([
    1.0, 0.9995, 0.9974, 0.9899, 0.9669,
    0.9048, 0.7509, 0.4043, 0.0
], dtype=np.float32)

SIGMAS_HARD = np.array([
    1.0, 0.9970, 0.9845, 0.9420, 0.8540,
    0.6900, 0.3800, 0.0800, 0.0
], dtype=np.float32)


# ============================================================
# ИНТЕРПОЛЯЦИЯ
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


class SigmaboyTurbo(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_SigmaboyTurbo",
            display_name="Sigmaboy Turbo",
            category="Rimor_dev/schedulers",
            description="Sigma scheduler for Qwen-Image 2.1 Turbo. "
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
        # Интерполяция
        sigmas_np = interpolate_sigmas(aggression, SIGMAS_SOFT, SIGMAS_BASE, SIGMAS_HARD)
        sigmas = torch.from_numpy(sigmas_np).float()

        # Лог
        print(f"\033[92m[Sigmaboy Turbo]\033[0m aggression: {aggression:.2f} | "
              f"sigmas: {[round(float(s), 4) for s in sigmas_np]}")

        # Отправка в UI (для статус-бара, если понадобится)
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
                            "sigmaboy_status",
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