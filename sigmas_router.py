from comfy_api.latest import ComfyExtension, io


class SigmasRouter(io.ComfyNode):
    """Router for SIGMAS with dynamic port count (6 default, up to 30)."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_SigmasRouter",
            display_name="SIGMAS Router",
            category="Rimor_dev/utilities",
            description="Routes one of N SIGMAS inputs to output. Default 6 ports, expandable to 30.",
            inputs=[
                io.Int.Input(
                    "inputcount", default=6, min=6, max=30, step=1,
                    display_name="Input Count",
                    tooltip="Number of input ports (6-30). Click 'Update inputs' to apply."
                ),
                io.Int.Input(
                    "active_channel", default=1, min=1, max=30, step=1,
                    display_name="Active Channel",
                    tooltip="Which input to pass through (1-N)"
                ),
            ],
            outputs=[
                io.Sigmas.Output(),
            ]
        )

    @classmethod
    def execute(cls, inputcount, active_channel, **kwargs) -> io.NodeOutput:

        sigmas_dict = {}
        for key, value in kwargs.items():
            if key.startswith("sigmas_") and value is not None:
                try:
                    idx = int(key.split("_")[1])
                    sigmas_dict[idx] = value
                except (IndexError, ValueError):
                    continue

        selected = sigmas_dict.get(active_channel)
        if selected is not None:
            print(f"[SigmasRouter] Channel {active_channel} — passing SIGMAS")
            return io.NodeOutput(selected)

        print(f"[SigmasRouter] Channel {active_channel} has no SIGMAS connected!")
        return io.NodeOutput(None)

    sample = execute