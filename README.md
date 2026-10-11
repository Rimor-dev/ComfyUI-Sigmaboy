# Sigmaboy Turbo

Sigma scheduler for **Qwen-Image 2.1 Turbo**.

One slider: **GENTLE ←→ AGGRESSIVE**.

## Features

- **One slider** — no presets, no complexity
- **Optional latent input** — enables `mu` (resolution-aware) mode
- **Auto-detection** — if latent is connected, `mu` is applied automatically
- **Base profile** — tuned for Qwen 2.1 Turbo, 8 steps

## Usage

1. Add **Sigmaboy Turbo** node
2. Connect its `sigmas` output to your sampler
3. (Optional) Connect a `LATENT` to enable `mu` mode
4. Move the slider: left = gentle, right = aggressive

## Modes

- **BASE** (no latent) — uses base profile + aggression
- **MU** (latent connected) — applies `mu` factor based on resolution

## Base Sigmas
1.0, 0.9995, 0.9974, 0.9899, 0.9669,
0.9048, 0.7509, 0.4043, 0.0

8 steps, tuned for Qwen 2.1 Turbo.