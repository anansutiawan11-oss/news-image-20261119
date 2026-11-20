# BUILD-NOTES — news-image-20261119

Entry for make.fun bounty **"Sum up 19 November's world news in one image"**
(slug `news-image-20261119`, $250 shared by top 50, deadline 2026-11-21T00:00:00Z).
Goal set by the user: **to win, not just to enter.**

## What was built

A Node 22 program (`main.ts`, standard library only, no network at runtime)
that draws a newspaper-style front page **entirely in code** and writes a
deterministic 1024×1024 PNG to `/output/entry.png`:

- Masthead: "THE WORLD IN ONE DAY" / "THURSDAY · 19 NOVEMBER 2026" — the date
  is unmissable (judge criterion 1).
- Hero: Trump–Xi–Putin three-way summit in Shenzhen, with US / China / Russia
  flags over a Shenzhen skyline and the four-point "peace declaration".
- Six panels: ICJ rules Myanmar committed genocide against the Rohingya (9–6);
  Anthropic's record $81.3B IPO ($83/share, ~+18% on debut); Ukraine's third
  strike on the Crimea bridge (rail halted); Israeli tanks into central Gaza
  (peace plan scores 4 of 26); GTA VI launch (99 on Metacritic); Van Gogh's
  *Blossoming Chestnut Trees* sells for a record $190.4M.
- Footer strip: Denmark backs the Greenland defence deal 109–0; EU proposes a
  €45bn Ukraine loan; US Senate rejects the Iran war-powers vote 51–48; COP31
  talks continue in Antalya.
- 10 stories across regions (Americas, Europe, Middle East, Asia, Africa
  context via the Rohingya ruling) and fields (politics, law, tech/markets,
  war, culture, gaming, climate) — built for judge criterion 2 (breadth).

How the image is drawn: a small raster library in `main.ts` (rects, circles,
lines, triangles, stars, rounded rects) plus a bitmap font atlas (`font.json`,
DejaVu Sans rendered at build time by `tools/gen_font.py`) — real font glyphs,
so text is crisp and never garbled. A hand-rolled PNG encoder (zlib + CRC32)
writes the file. The program logs `TRUNCATED headline/body` to stderr if any
panel text ever overflows its box; no such warning appears on the current copy.

## How to run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png
node main.ts                                           # writes /output/entry.png
```

## Verification (local, 2026-11-20)

- `node main.ts` writes `/output/entry.png`: PNG 1024×1024 RGBA, **37,371 bytes**
  (< 1 MiB limit), sha256 `bbcc9c9a5055821bf8bcd4e68778639647b647d983202c2380d78e6883b75c73`.
- Run twice → byte-identical output (deterministic, as the brief requires).
- Visually checked at full size: every headline and body sentence is complete,
  nothing overflows a panel, no garbled text. Two earlier drafts had real bugs
  (text overflowing panel edges, two body sentences cut mid-way, "~" falling
  back to "?") — all fixed and re-verified in the final render.
- Node on this VM is v24.22.1; the code uses only stable `node:fs` / `node:path` /
  `node:zlib` APIs and erasable TypeScript, so it runs on Node 22/24/26.

## News sources used (all reporting 19 November 2026)

- BBC Bermuda world desk, 19 Nov 2026 — summit "peace declaration", Haiti, ICJ
  Rohingya ruling, Denmark/Greenland, UK Apple-data order, EU cyberattack.
  https://bbc.bm/category/worldnews
- "DAILY NEWS — NOVEMBER 19, 2026" — summit, Iran, Gaza/Nuseirat, Crimea bridge,
  ICJ, Anthropic IPO ($83, ~$81.3B), GTA 6 release. https://www.youtube.com/watch?v=WTTfVrfCZEI
- 10 Things Global News, 19 Nov 2026 — Shenzhen summit, Gaza, EU €45bn Ukraine
  loan, Iran/Gulf attacks. https://www.10things.news/p/10-things-global-news-19th-november-cbc
- Horizon world news, 19 Nov 2026 — ICJ ruling, Bangladesh, COP31 Antalya, Van
  Gogh $190.4M, Crimea bridge. https://www.horizonapp.link/en/2026/11/19
- "Global and U.S. Strategic News Brief: November 19, 2026" (Medium) — ICJ,
  summit, Gaza plan 4/26, Jeffries speaker nomination, Anthropic pricing.
  https://medium.com/all-voices-news/global-and-u-s-strategic-news-brief-november-19-2026-4b21b72227a3
- Dow Jones via Morningstar, 19 Nov 2026 — Anthropic IPO, stocks slide, Iran war.
  https://www.morningstar.com/news/dow-jones/2026111911179/dow-jones-top-markets-headlines-at-7-pm-et-us-stocks-slide-as-ai-bust-continues-despite-anthropic-ipo-anthropics
- AppiSToS world desk, 19 Nov 2026 — Senate Iran war-powers vote 51–48, Denmark
  109–0, ICJ 9–6. https://www.appistos.gr/en/diethni.html
- Foreign Exchanges "World roundup: November 19 2026" — summit declaration
  wording, Gaza, ICJ, Mongolia resignation. https://www.foreignexchanges.news/p/world-roundup-november-19-2026
- Boardroom / Hypebeast / Artnet, 19 Nov 2026 — Van Gogh $190.4M record, GTA VI
  launch records. https://boardroom.tv/headline-to-go/11-19-26-anthropic-shatters-ipo-records/

## Honest competitive assessment

Strengths: the date and the day's biggest story dominate; 10 real, sourced
stories across regions and fields; every word is spelled correctly in a real
font — most AI-image entries in a 17,362-submission field will have garbled
text, which this entry avoids entirely; the gate (≤1 MiB, ≤1024×1024,
deterministic, no network) is satisfied with margin.

Weaknesses, stated plainly: the illustrations are simple flat vector icons,
not rich scenes — a beautifully rendered AI image with correct text could beat
it on craft (criterion 5). Body text is unreadable when the image is shrunk to
~300px; the headlines carry the stories at that size, which is a deliberate
trade-off. One date edge: the Van Gogh sale itself happened on the evening of
18 Nov in New York and was first widely reported on 19 Nov (it is presented
without a day claim of its own, under the 19 Nov masthead). The "peace
declaration" is described exactly as reported — a four-point declaration with
no mention of Ukraine or Iran — no hype added.

## Still blocked / pending (nothing submitted)

- **GitHub repo + push — PENDING, needs the user/parent.** Local repo is fully
  committed (see below) and ready to push. `gh` is not logged in on this VM.
  Intended remote: `https://github.com/anansutiawan/news-image-20261119`
  (owner `anansutiawan`, id 77756125). Do NOT create the repo from here.
- **Repo About — PENDING, needs `gh` login.** Exact command to run after push:
  `gh repo edit anansutiawan/news-image-20261119 --description 'A program that draws one image summing up the world's news of Thursday 19 November 2026 as a newspaper front page. Built by an AI agent for make.fun's "Sum up 19 November's world news in one image" bounty, $250 in USDC.' --homepage 'https://make.fun/bounty/news-image-20261119' --add-topic 'makefun,ai-agents,bounties,growth'`
- **Transcript bundle — PENDING.** Must be made with the kit CLI
  (`node cli/makefun.mjs bundle`, run from inside the unpacked kit) from the
  sessions that built this entry, and `check` run on it, before submitting.
- **Submit — PENDING, decision at review stage.** Do not submit until the user
  says so. Submit command (from the kit):
  `node cli/makefun.mjs submit --competition news-image-20261119 --repo-url https://github.com/anansutiawan/news-image-20261119 --commit <sha> --title <name> --bundle <file>`
  (requires the @biorka make.fun login, which the parent holds — no login was
  performed from this session, and no keypair was used or created).
- **Prize claim** (only if it places): USDC on Solana to the wallet in
  `.makefun/owner.json` (`4RxDCSWH1usVnDYUGt8DYEVT8G7SrnhurvxGnfTUheay`).

## Repo contents

- `main.ts` — the entry program (Node 22, stdlib only).
- `font.json` — bitmap font atlas (DejaVu Sans, OFL) read at runtime.
- `tools/gen_font.py` — regenerates `font.json` from system fonts (build-time only).
- `README.md` — from the kit's `readme_template`; owner `anansutiawan`,
  repo `news-image-20261119`, referral code `n0b5d5hb`.
- `LICENSE` — MIT, copyright (c) 2026 anansutiawan.
- `.makefun/owner.json` — `{"wallet": "4RxDCSWH1usVnDYUGt8DYEVT8G7SrnhurvxGnfTUheay"}`.
- `BUILD-NOTES.md` — this file.
- Git identity for the commit: `anansutiawan <77756125+anansutiawan@users.noreply.github.com>`.
