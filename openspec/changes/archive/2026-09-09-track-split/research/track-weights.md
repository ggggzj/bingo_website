# AI-Engineer track pattern weights — for owner review

Drafted: 2026-09-09. Applies to new-problem scoring only; `sde` is 1.0
everywhere by definition. Boosts only, no penalties: AI interviews still
test general coding, so nothing is de-prioritized — ML-adjacent patterns
are pulled forward, the rest keep their normal order.

| pattern | multiplier | rationale |
|---|---|---|
| matrix | 1.30 | Tensor/grid manipulation is daily ML work; grid problems are the most common ML-screen coding flavor |
| math | 1.30 | Numeric reasoning and probability-adjacent computation dominate ML coding screens |
| heap | 1.25 | Top-k retrieval and beam-search style selection are ML infrastructure staples |
| quickselect | 1.25 | K-th statistic / percentile computation — evaluation metrics territory |
| prefix-sum | 1.20 | Cumulative statistics and windowed aggregates over data streams |
| sliding-window | 1.20 | Streaming metrics over token/event windows |
| hash-map | 1.15 | Feature dictionaries, dedup, caching — the bread of data pipelines |
| _all 22 others_ | 1.00 | Common ground for both tracks; no penalty by design |

Clamp: a problem's factor = max over its patterns' multipliers, clamped to
[0.5, 1.5] (headroom for future tuning; nothing drafted here exceeds 1.30).

**Approved by owner 2026-09-09** — as drafted, no adjustments.
