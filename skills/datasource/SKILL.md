---
name: datasource
description: Use when the user needs structured external data — stocks, financials, macroeconomics, academic papers, enterprise info, or legal records. Guides which public source to query and how to search it with available web tools.
---

# Datasource

Reference catalog of public data sources. Use whatever web search/fetch tools are available in the current session to query them.

## When to Use

- Stock prices, financials, analyst ratings, options
- Macroeconomic data (GDP, inflation, population)
- Academic papers and preprints
- Enterprise information (shareholders, patents, legal risk)
- Laws, regulations, judicial cases

**Not for:** opinion pieces, real-time news, general Q&A.

## Sources

| Domain | Best source | Search query pattern |
|---|---|---|
| US / global stocks | Yahoo Finance, Google Finance | `site:finance.yahoo.com AAPL` or ticker + "stock price" |
| A-share / HK stocks | East Money, Sina Finance | ticker code + "stock quote" (e.g. `600519.SH quote`) |
| Company financials | Yahoo Finance, SEC EDGAR, annual reports | `AAPL 10-K 2024` or company + "annual report" |
| Analyst ratings | Yahoo Finance, TipRanks | company + "analyst ratings consensus" |
| Macroeconomics | World Bank Open Data, IMF, FRED | `site:data.worldbank.org GDP China` or `site:fred.stlouisfed.org CPI` |
| arXiv preprints | arxiv.org | `site:arxiv.org RAG survey 2024` or `arxiv.org/abs/2406.xxxxx` |
| Google Scholar | scholar.google.com | `site:scholar.google.com "transformer" survey` |
| Semantic Scholar | semanticscholar.org | `site:semanticscholar.org author:"Hinton"` |
| ML models / datasets | huggingface.co | `site:huggingface.co whisper` or `huggingface.co/models?search=llama` |
| Code / repos / issues | github.com | `site:github.com org:pytorch "flash attention"` or `github.com/user/repo` |
| Enterprise info (CN) | Tianyancha, Qichacha | company full legal name + "shareholders" or "patents" |
| Legal / judicial (CN) | China Judgements Online, pkulaw.com | statute name + article number, or case keywords |
| Patents | Google Patents, USPTO, WIPO | `site:patents.google.com "neural network" training` |

## Available Web Tools

Use whatever search/fetch tools are available in the current session. Check for them before starting.

### Search tools

| Tool | Environment | Notes |
|---|---|---|
| `ollama_web_search` | MCP (ollama-web) | `query`, `max_results` (default 5) |
| `searxng_web_search` | MCP (searxng) | `query`, supports `time_range`, `language`, `categories`, `engines`, `min_score` |
| `searxng_search_suggestions` | MCP (searxng) | Autocomplete — refine vague queries before searching |
| `mcp__MiniMax__web_search` | MCP (MiniMax) | `query` only |
| `WebSearch` | Claude Code built-in | `query`, supports `allowed_domains` / `blocked_domains` filtering |

### Fetch tools (read a specific URL)

| Tool | Environment | Notes |
|---|---|---|
| `ollama_web_fetch` | MCP (ollama-web) | Pass full URL, returns content |
| `web_url_read` | MCP (searxng) | Supports `section`, `readHeadings`, `startChar`/`maxLength` for pagination |
| `WebFetch` | Claude Code built-in | `url` + `prompt` (AI-processed extraction) |

### Search tips

- Use `site:` to target a specific source (e.g. `site:arxiv.org`)
- Use `allowed_domains` in `WebSearch` or `engines` in `searxng_web_search` to narrow results
- For financial data, include the exact ticker symbol with exchange suffix
- For academic papers, include year to get recent results
- For macro data, name the indicator explicitly (GDP, CPI, unemployment rate)
- Combine multiple searches when comparing across sources
- If one tool returns no results, try another — coverage varies

## Delivering Analysis

Match depth to what the user asked:

| User intent | What to deliver |
|---|---|
| Single fact ("what's AAPL at?") | One-line answer with source |
| Comparison ("AAPL vs MSFT revenue") | Summary table with key differences highlighted |
| Trend ("China GDP over 10 years") | Table + describe direction, magnitude, inflection points |
| Deep dive ("analyze CATL financials") | Compute derived metrics (margins, ratios, YoY), structure into sections |
| Multi-source ("papers on X + market size") | Combine results from multiple searches into unified analysis |

**Guidelines:**
- Show source data (numbers, tables) before conclusions
- Compute derived metrics when relevant: growth rates, margins, ratios
- Flag data gaps or caveats (currency, time period, adjusted vs raw)
- For time series: describe the trend, don't just list numbers
- For comparisons: lead with differences, not similarities
- Always cite the source URL or name

## Conventions

- Answer in the user's language.
- For financial data, always add: "AI-generated, not investment advice".
- If a source is unreachable, try the next one — don't stop at first failure.
