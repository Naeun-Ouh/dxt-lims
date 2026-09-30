# DXT Study terminology compatibility

DXT UI/UX v1 uses **Study** as the user-facing term for the long-running scientific objective and shared context.

Internal identifiers such as `Series`, `seriesSlug`, `/series/*`, and `experiment-series` remain temporarily for compatibility. They are implementation migration debt, not user-facing UX debt. No route or domain-wide rename was performed for this normalization pass.
