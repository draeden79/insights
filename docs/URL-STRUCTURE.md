# Alitar Insights — Minimal Naming & URL Spec (v0)

## Base

* All public content lives under: **`/insights`**

## Single Unit: Insight

* One **Insight** = one page that contains the analysis + charts.
* Canonical URL:

  * **`/insights/{insight_slug}`**

Examples:

* `/insights/sp500-crash-radar`
* `/insights/us-yield-curve-monitor`

## Slug Rules

* lowercase, `kebab-case` only (`a-z`, `0-9`, `-`)
* short and descriptive (avoid `v2`, `update`, dates)
* once published, **do not change** the slug

## View Configuration (Query Params)

* Use query params only for user-selected options (not identity):

  * `/insights/sp500-crash-radar?metric=pe&window=60&shift=12`
