from .sigmaboy_nodes import SigmaboyTurbo
from .sigmas_router import SigmasRouter

NODE_CLASS_MAPPINGS = {
    "Rimor_SigmaboyTurbo": SigmaboyTurbo,
    "Rimor_SigmasRouter": SigmasRouter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Rimor_SigmaboyTurbo": "Sigmaboy Turbo",
    "Rimor_SigmasRouter": "SIGMAS Router",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]