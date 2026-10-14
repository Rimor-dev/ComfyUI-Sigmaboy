import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Rimor.Sigmaboy";

const { api } = window.comfyAPI.api;

api.addEventListener("sigmaboy_status", (e) => {
    const data = e.detail;
    if (!data || data.node_id == null) return;
    const nodeId = parseInt(data.node_id, 10);
    if (isNaN(nodeId)) return;
    const node = app.graph?.getNodeById?.(nodeId);
    if (node?._sigmaboyStatusHandler) {
        node._sigmaboyStatusHandler(data);
    }
});


const COLORS = {
    accentColor: "#4a90d9",
    backgroundColor: "#1a1a1a",
    textColor: "#999999",
    sliderBg: "#14181e",
    sliderFill: "#4a90d9",
    sliderThumb: "#4a90d9",
};

const UI_CONFIG = {
    minWidth: 240,
    logoHeight: 28,
    sliderTrackHeight: 6,
    sliderThumbSize: 16,
    valueFontSize: 14,
    labelFontSize: 11,
};

function calculateNodeHeight() {
    return 100 + UI_CONFIG.logoHeight + 20;
}


// ============================================================
// СЛАЙДЕР
// ============================================================
function createSlider(node, container, label, widgetName, defaultValue = 1.0, min = 1.0, max = 3.0, step = 0.01, onSave = null) {
    const row = document.createElement('div');
    row.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        font-family: monospace;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
        color: ${COLORS.textColor};
        font-size: ${UI_CONFIG.labelFontSize}px;
        letter-spacing: 1px;
        text-transform: uppercase;
    `;

    const valueEl = document.createElement('span');
    valueEl.textContent = defaultValue.toFixed(2);
    valueEl.style.cssText = `
        color: ${COLORS.accentColor};
        font-size: ${UI_CONFIG.valueFontSize}px;
        font-weight: bold;
    `;

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const track = document.createElement('div');
    track.style.cssText = `
        position: relative;
        width: 100%;
        height: ${UI_CONFIG.sliderTrackHeight}px;
        background: ${COLORS.sliderBg};
        border-radius: 3px;
        cursor: pointer;
    `;

    const fill = document.createElement('div');
    fill.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: ${COLORS.sliderFill};
        border-radius: 3px;
        pointer-events: none;
    `;

    const thumb = document.createElement('div');
    thumb.style.cssText = `
        position: absolute;
        top: 50%;
        width: ${UI_CONFIG.sliderThumbSize}px;
        height: ${UI_CONFIG.sliderThumbSize}px;
        background: ${COLORS.sliderThumb};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 4px rgba(74, 144, 217, 0.5);
    `;

    track.appendChild(fill);
    track.appendChild(thumb);
    row.appendChild(header);
    row.appendChild(track);

    const labels = document.createElement('div');
    labels.style.cssText = `
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: ${UI_CONFIG.labelFontSize}px;
        color: ${COLORS.textColor};
        margin-top: 2px;
    `;
    labels.innerHTML = `<span>BASE</span><span>HARD</span>`;
    row.appendChild(labels);

    container.appendChild(row);

    let currentValue = defaultValue;
    const range = max - min;

    function updateVisual(value) {
        const pct = (value - min) / range;
        fill.style.width = (pct * 100) + '%';
        thumb.style.left = (pct * 100) + '%';
        valueEl.textContent = value.toFixed(2);
    }

    function setValue(value, fromUser = false) {
        currentValue = Math.max(min, Math.min(max, value));
        updateVisual(currentValue);

        const w = node.widgets?.find(x => x.name === widgetName);
        if (w) {
            w.value = currentValue;
            if (w._state && typeof w._state === 'object') {
                w._state.value = currentValue;
            }
        }

        // ВАЖНО: обновляем widgets_values для ComfyUI
        const widgetIndex = node.widgets?.findIndex(x => x.name === widgetName);
        if (widgetIndex !== undefined && widgetIndex >= 0) {
            if (!node.widgets_values) node.widgets_values = [];
            node.widgets_values[widgetIndex] = currentValue;
        }

        // Сохранение через callback
        if (onSave) onSave();

        if (fromUser && node.graph) {
            node.graph.change?.();
        }
    }

    let isDragging = false;

    function handlePointer(e) {
        const rect = track.getBoundingClientRect();
        const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        const rawValue = min + pct * range;
        const stepped = Math.round(rawValue / step) * step;
        setValue(stepped, true);
    }

    track.addEventListener('pointerdown', (e) => {
        isDragging = true;
        track.setPointerCapture?.(e.pointerId);
        handlePointer(e);
    });
    track.addEventListener('pointermove', (e) => {
        if (isDragging) handlePointer(e);
    });
    track.addEventListener('pointerup', (e) => {
        isDragging = false;
        track.releasePointerCapture?.(e.pointerId);
    });
    track.addEventListener('dblclick', () => {
        setValue(1.0, true);
    });

    // Инициализация
    updateVisual(currentValue);

    return {
        getValue: () => currentValue,
        setValue: (v) => setValue(v, false),
    };
}


// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
app.registerExtension({
    name: EXTENSION_NAME,

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeType.comfyClass === "Rimor_SigmaboyTurbo") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const result = onNodeCreated?.apply(this, arguments);

                this._sigmaboyNodeId = String(this.id);

                requestAnimationFrame(() => {
                    const widgetIndex = this.widgets?.findIndex(w => w.name === "node_id_hidden");
                    if (widgetIndex !== undefined && widgetIndex >= 0) {
                        if (!this.widgets_values) this.widgets_values = [];
                        this.widgets_values[widgetIndex] = String(this.id);
                        const widget = this.widgets[widgetIndex];
                        widget.value = String(this.id);
                        if (widget._state && typeof widget._state === 'object') {
                            widget._state.value = String(this.id);
                        }
                    }
                });

                // Скрываем aggression
                if (this.widgets) {
                    for (const w of this.widgets) {
                        if (w.name === "aggression") {
                            w.hidden = true;
                            w.computeSize = () => [0, -4];
                        }
                    }
                }

                const minHeight = calculateNodeHeight();
                const originalComputeSize = this.computeSize?.bind(this);
                this.computeSize = function (width) {
                    let size = originalComputeSize
                        ? originalComputeSize(width)
                        : [width || this.size[0], minHeight];
                    if (size[1] < minHeight) size[1] = minHeight;
                    if (size[0] < UI_CONFIG.minWidth) size[0] = UI_CONFIG.minWidth;
                    return size;
                };
                if (this.size[1] < minHeight) this.size[1] = minHeight;
                if (this.size[0] < UI_CONFIG.minWidth) this.size[0] = UI_CONFIG.minWidth;

                const container = document.createElement('div');
                container.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                    height: 100%;
                    padding: 8px;
                    box-sizing: border-box;
                    font-family: monospace;
                `;
                this.addDOMWidget("sigmaboy_main", "main_container", container, { serialize: false });

                // Объявляем slider заранее
                let slider;

                // Определяем saveSettings СРАЗУ
                let saveTimeout;
                const saveSettings = () => {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.properties = this.properties || {};
                        this.properties.sigmaboySettings = {
                            aggression: slider?.getValue() ?? 1.0,
                        };
                        this.graph?.change?.();
                    }, 200);
                };

                // Слайдер с callback
                const aggressionValue = this.widgets?.find(w => w.name === "aggression")?.value ?? 1.0;
                slider = createSlider(
                    this, container,
                    "Aggression",
                    "aggression",
                    aggressionValue,
                    1.0, 3.0, 0.01,
                    saveSettings
                );

                // Восстановление при загрузке
                const origOnConfigure = this.onConfigure;
                this.onConfigure = () => {
                    if (origOnConfigure) origOnConfigure.apply(this, arguments);
                    const s = this.properties?.sigmaboySettings;
                    if (s?.aggression !== undefined) {
                        slider.setValue(parseFloat(s.aggression));
                    } else {
                        // Fallback: читаем из widgets_values
                        const widgetIndex = this.widgets?.findIndex(w => w.name === "aggression");
                        if (widgetIndex !== undefined && widgetIndex >= 0 && this.widgets_values) {
                            const val = parseFloat(this.widgets_values[widgetIndex]);
                            if (!isNaN(val)) {
                                slider.setValue(val);
                            }
                        }
                    }
                };

                // Логотип
                const logoContainer = document.createElement('div');
                logoContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px 6px;
                    height: ${UI_CONFIG.logoHeight}px;
                    min-height: ${UI_CONFIG.logoHeight}px;
                    max-height: ${UI_CONFIG.logoHeight}px;
                    background: linear-gradient(180deg, ${COLORS.backgroundColor}, #0a0a0a);
                    border-radius: 8px;
                    margin-top: auto;
                    box-sizing: border-box;
                    width: 100%;
                `;
                logoContainer.innerHTML = `
                    <svg width="170" height="20" viewBox="0 0 170 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="6" stroke="${COLORS.accentColor}" stroke-width="1" opacity="0.5"/>
                        <path d="M5 10 Q7.5 5 10 10 T15 10" stroke="${COLORS.accentColor}" stroke-width="1.5" fill="none"/>
                        <text x="24" y="15" fill="${COLORS.accentColor}" font-size="12" font-family="monospace" font-weight="bold" letter-spacing="1">SIGMABOY TURBO</text>
                    </svg>
                `;
                container.appendChild(logoContainer);

                this.onRemoved = () => {
                    this._sigmaboyStatusHandler = null;
                };

                return result;
            };
        }
    }
});