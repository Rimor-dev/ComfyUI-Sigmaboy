from .sigmaboy_nodes import SigmaboyTurbo
from .sigmaboy_16_nodes import SigmaboyTurbo16
from .sigmas_router import SigmasRouter

NODE_CLASS_MAPPINGS = {
    "Rimor_SigmaboyTurbo": SigmaboyTurbo,
    "Rimor_SigmaboyTurbo16": SigmaboyTurbo16,
    "Rimor_SigmasRouter": SigmasRouter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Rimor_SigmaboyTurbo": "Sigmaboy Turbo",
    "Rimor_SigmaboyTurbo16": "Sigmaboy Turbo 16",
    "Rimor_SigmasRouter": "SIGMAS Router",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]