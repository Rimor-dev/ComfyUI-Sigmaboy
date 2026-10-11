import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Rimor.SigmasRouter";

const COLORS = {
    accentColor: "#4a90d9",
    backgroundColor: "#1a1a1a",
};

const UI_CONFIG = {
    logoHeight: 28,
};

function setupDynamicInputs(node, { type, prefix, countWidget = "inputcount" } = {}) {
    const rebuild = () => {
        if (!node.inputs) node.inputs = [];
        const countW = node.widgets?.find(w => w.name === countWidget);
        if (!countW) return;
        const target = countW.value;
        const current = node.inputs.filter(i => i.name?.startsWith(prefix)).length;
        if (target === current) return;
        if (target < current) {
            for (let i = 0; i < current - target; i++) node.removeInput(node.inputs.length - 1);
        } else {
            for (let i = current + 1; i <= target; i++) node.addInput(`${prefix}${i}`, type);
        }
    };
    node.addWidget("button", "Update inputs", null, rebuild);
    const countW = node.widgets?.find(w => w.name === countWidget);
    if (countW) {
        const origCb = countW.callback;
        countW.callback = function (value, canvas) {
            const r = origCb ? origCb.apply(this, arguments) : undefined;
            if (!canvas) rebuild();
            return r;
        };
        if (countW.value > 0) {
            rebuild();
        }
    }
    return rebuild;
}

app.registerExtension({
    name: EXTENSION_NAME,

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeType.comfyClass === "Rimor_SigmasRouter") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);

                // Динамические входы
                setupDynamicInputs(this, { type: "SIGMAS", prefix: "sigmas_" });

                // Логотип
                const logoContainer = document.createElement('div');
                logoContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px 6px;
                    height: ${UI_CONFIG.logoHeight}px;
                    min-height: ${UI_CONFIG.logoHeight}px;
                    max-height: ${UI_CONFIG.logoHeight}px;
                    background: linear-gradient(180deg, ${COLORS.backgroundColor}, #0a0a0a);
                    border-radius: 8px;
                    margin: 2px;
                    font-family: monospace;
                `;
                logoContainer.innerHTML = `
                    <svg width="160" height="18" viewBox="0 0 160 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="9" r="6" stroke="${COLORS.accentColor}" stroke-width="1" opacity="0.5"/>
                        <path d="M4 9 Q6 5 9 9 T14 9" stroke="${COLORS.accentColor}" stroke-width="1.5" fill="none"/>
                        <text x="22" y="13" fill="${COLORS.accentColor}" font-size="9" font-family="monospace" font-weight="bold" letter-spacing="1">SIGMAS ROUTER</text>
                    </svg>
                `;
                this.addDOMWidget("rimor_logo_sigmasrouter", "logo", logoContainer, { serialize: false });

                return result;
            };
        }
    }
});