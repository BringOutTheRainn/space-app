# Stardust Empire: game design

A space-themed incremental clicker for phones, in the spirit of Cookie Clicker. You start by tapping a
lonely asteroid for Stardust and end up running a galaxy-spanning industry that collapses and reboots
the universe for Dark Matter.

## Stack

TypeScript, plain HTML/CSS and a canvas, no framework. Wrapped as an Android (and later iOS) app with
Capacitor; the same build runs in any browser. Reasons:

- A clicker is mostly buttons, lists and big numbers, which HTML does well and cheaply.
- The game logic is pure functions over one state object, so it is unit tested with Node's test runner.
- Real screens are checked with headless Chromium (Playwright) at phone sizes.
- The GitHub Actions workflow wraps the web build in Capacitor and builds an installable APK.

The old Godot city builder stays in git history on `main`; the new game replaces it on this branch.

## Core loop

1. **Tap** the celestial body in the middle of the screen to harvest Stardust.
2. **Buy generators** that produce Stardust per second (SPS) without tapping.
3. **Buy upgrades** that multiply generators and taps.
4. **Catch comets** that fly across the screen for short, powerful boosts.
5. **Collapse the universe** (prestige) for Dark Matter: a permanent production bonus and a currency for
   permanent Cosmic upgrades. Start again, faster.

Progress continues while the app is closed (offline earnings at a reduced rate).

## Currency and numbers

- **Stardust**: main currency. Doubles; numbers shown as 1.23K, 4.56M ... up to Decillion, then
  scientific notation (setting to always use scientific).
- **Dark Matter**: prestige currency. Total Dark Matter gives +2% production each; spending it on
  Cosmic upgrades does not reduce the bonus.

## Generators

Price of the n-th copy is `base * 1.15^n`. Each generator has its own icon and flavor line.

| # | Generator | Base cost | Base SPS |
|---|---|---|---|
| 1 | Mining Drone | 15 | 0.1 |
| 2 | Asteroid Harvester | 100 | 1 |
| 3 | Lunar Base | 1.1K | 8 |
| 4 | Orbital Station | 12K | 47 |
| 5 | Gas Giant Siphon | 130K | 260 |
| 6 | Fusion Reactor | 1.4M | 1.4K |
| 7 | Dyson Swarm | 20M | 7.8K |
| 8 | Warp Gate | 330M | 44K |
| 9 | Nebula Refinery | 5.1B | 260K |
| 10 | Star Forge | 75B | 1.6M |
| 11 | Quasar Tap | 1T | 10M |
| 12 | Wormhole Network | 14T | 65M |
| 13 | Galaxy Engine | 170T | 430M |
| 14 | Universe Compiler | 2.1Qa | 2.9B |

Generators are revealed one at a time: a generator shows once you have owned the previous one, and is
shown as a silhouette until you have half its price.

## Upgrades

- **Generator tiers**: x2 to one generator at 1, 5, 25, 50, 100, 150, 200, 250 owned. Price scales from
  the generator's base cost.
- **Drone synergy** (Cookie Clicker's cursor): Mining Drones gain a flat bonus per non-drone generator.
- **Tap upgrades**: x2 tap power tiers, and "Gravity Gloves" lines that add a percent of SPS to each tap.
- **Comet upgrades**: comets appear more often and last longer.
- **Synergies**: pairs of generators boost each other (e.g. Lunar Base +5% per Orbital Station).
- **Research**: flat production multipliers unlocked by total Stardust milestones.

Upgrades show in a row of icons when affordable or close to it; bought ones are listed in Stats.

## Comets (random events)

A comet streaks across the screen every 2 to 5 minutes and stays tappable for about 13 seconds.
Tapping gives one of:

| Effect | Chance | Result |
|---|---|---|
| Stardust Rush | 45% | Production x7 for 77 s |
| Lucky Haul | 45% | +min(15% of bank, 15 min of production) + 13 |
| Supernova Tap | 10% | Tap power x777 for 13 s |

Rare **Black Comet** (after first prestige): a bigger reward or a short x0.5 "Gravity Well" penalty.

## Achievements

Earned for totals (Stardust earned, taps, generators owned, comets caught, prestiges, specific feats).
Each achievement gives +1% production ("Constellations"), shown in a grid with locked silhouettes.

## Prestige: Collapse the Universe

- Available once lifetime Stardust earned reaches 10 billion (about 1.5 hours of active play).
- Total Dark Matter = `floor(cbrt(lifetimeEarned / 1e10))`; a collapse grants the difference from what you already have.
- Collapse resets Stardust, generators and upgrades. Keeps achievements, Dark Matter and Cosmic upgrades.
- The celestial body evolves with total Dark Matter and progress: asteroid, moon, rocky planet, ringed
  gas giant, star, pulsar, black hole.

## Cosmic upgrades (spend Dark Matter)

A small tree of permanent perks, e.g.: start with 10% offline rate → 50% → 90%; comets more often;
keep a few generator tiers; start each universe with some Stardust; extra Constellation bonus;
unlock buy-max; unlock auto-tapper drones; unlock the Expeditions screen.

**Stellar Echoes** (after the whole tree is owned): a repeatable Dark Matter upgrade, x1.25 all
production per level, costing 1,000 Dark Matter and doubling each level. Kept through collapses.

## Expeditions (later milestone)

Send probes to named systems for a fixed real time (5 min to 8 h). Returns Stardust, a temporary boost or
rare "Relics" that give permanent small multipliers. Gives players a reason to check back.

## Daily and session features

- Offline earnings popup on return, with a "double it" rewarded ad button.
- Comeback gift: 2 hours of free Hyperdrive after 3+ days away, at most once a week, with one reminder when it is due.
- Daily login reward streak (Stardust boost, Dark Matter shard on day 7).
- News ticker with funny space headlines that change with progress.

## Screens (portrait phone)

- **Top bar**: Stardust count, SPS, settings button.
- **Center**: the celestial body on a parallax starfield, floating "+N" numbers and particles on tap.
- **Bottom tabs**: Build (generators + upgrade strip), Upgrades, Achievements, Stats, Cosmos (prestige
  and cosmic tree, once unlocked).
- Buy amount toggle: x1 / x10 / x100 / Max.

## Feel

- Satisfying tap: squash animation, particles, floating numbers, a soft synthesized click (Web Audio),
  short vibration on Android. Sound and vibration toggles in settings.
- Big number counters ease towards the real value.
- Dark, high-contrast space palette with neon accents. Safe-area aware for notches.

## Saving

Auto-save every 10 s and when the app goes to the background, to local storage. Saves are versioned
JSON with migrations. Export/import a save string from Settings. Hard reset with confirmation.
A second backup copy is written every 5 minutes; if the main save cannot be read, the game loads the
backup and keeps the broken copy under a `-broken-<time>` key. Non-finite numbers (NaN, Infinity) are
reset on load and before every save. On Android a third copy goes to Capacitor Preferences, which
survives the WebView clearing its storage, and is restored on start when it is further ahead.

## Monetization: ads (built)

Ads are mostly opt-in, so the game never feels pay-to-skip:
- **Tap Frenzy** (rewarded): 60 s of 20 auto-taps a second, taps x10, 5 minute recharge.
- **Mission swap** (rewarded): trade an unwanted mission for a new one.
- **Hyperdrive** (rewarded): x2 production for 2 h, stacks to 8 h, keeps running offline. Button on the
  sky appears once the first Asteroid Harvester is bought.
- **x2 offline earnings** and **x2 daily drop** (rewarded).
- **Break ad** (interstitial) after a collapse or entering an anomaly: at most every 8 minutes, never in
  the first 20 minutes of play.
- **Banner**: built but off by default.
- A `noAds` flag in the save turns off interstitials and banners, ready for a future "Remove ads" purchase.

AdMob through `@capacitor-community/admob`; a browser stand-in plays a countdown so every flow can be tried
on the web. IDs and pacing live in `src/data/ads.ts`. Release steps are in RELEASE.md.

## Milestones

1. **Core loop**: tap, Stardust, first 8 generators, buy x1/x10/x100/Max, saving, offline earnings,
   number formatting, phone layout, starfield. Tests and screenshots.
2. **Depth**: upgrades (tiers, taps, synergies), achievements, stats, comets, sound and vibration, news
   ticker, all 14 generators.
3. **Prestige**: Collapse the Universe, Dark Matter, Cosmic upgrades, celestial body evolution,
   settings with save export/import.
4. **Mobile release**: Capacitor Android build in CI (installable APK artifact), app icon, splash,
   safe areas, Android back button, pause/resume saving, performance pass, first-time hints.
5. **Widen scope**: Expeditions and Relics, daily rewards, Anomaly challenge runs, balance pass with a
   simulation that checks pacing to the first prestige (target 1.5 to 3 hours of active play).
6. **Ads**: Hyperdrive, x2 offline and daily rewards, paced break ads (see Monetization).
7. **Live research (twice daily, Oct 10 to 17)**: study similar games, add what fits, ship the best.
8. **Purchases (Oct 14, asked for by cj)**: a Shop with Google Play Billing (cordova-plugin-purchase)
   and a test checkout in browsers. Supporter Pack ($3.99: no break ads or banners, production x2),
   Starter Pack ($1.99, first 3 days: 10 crystals, 4 h of production, +10%), crystal packs (5/30/80),
   Event Pass ($2.99 per weekend: double Flux and a Platinum badge), Stardust Vault (saves 15 min of
   production per real hour up to 12 h, $2.99 to open), four planet skins ($0.99 each), a one-time
   starter pop-up after 20 minutes of play, Restore purchases. AdMob mediation adapters can be added
   from a CI variable. Setup steps are in docs/RELEASE.md. Star Pass ($4.99 per 4-week season, run 9).
9. **Launch sprint (Oct 16 to 19, Google Play, personal account)**: target API 36, save safety
   (backup, number repair, native copy), privacy policy (docs/PRIVACY.md, linked in Settings), then
   balance, first-time experience, low-end performance, accessibility, store listing and compliance.
   Run 2: store kit in docs/STORE.md (listing, content rating and data safety answers) and eight
   captioned 1080 x 1920 screenshots from tools/store-shots.mjs; Star Pass seasons now count from 1 at
   launch instead of showing the internal week-based number (it read "Season 40").
   Run 3: pacing checked with tools/simulate.mjs (first Dark Matter at 1h 24m, inside the target) and
   the first minutes replayed as a new player (hints lead tap, buy, comet, upgrade in order). Added
   Battery saver in Settings: the loop runs at about 30 fps and the sky draws at 1x density. The game
   watches the first 20 s of play once and turns it on, with a toast, when frames are slower than
   45 ms (under about 22 fps).
   Run 4: accessibility. The sky canvas is a focusable button (Enter, Space or a screen reader's
   double-tap harvests at the centre), upgrade buy buttons read "Buy <name> for <price> Stardust",
   and small buttons (top icons, buy chips, upgrade buy buttons, crystals, Hyperdrive) get an
   invisible larger touch area close to Android's 48 dp. Contrast and button names were checked on
   the Build, Upgrades and Settings screens; none failed.
   Run 5: Play compliance. Settings shows "Ad privacy choices" (Google's privacy options form) where
   the consent rules apply; the Android build removes the exact-alarm permission (reminders use
   inexact alarms) and reports whether native libraries are aligned for 16 KB pages.
   Run 6: crash safety. An error inside one frame no longer stops the game loop: it is logged, a toast
   says progress is safe, and the game carries on. Uncaught errors and promise rejections are kept (last
   10, on the phone only), and Settings shows "Copy error report" when there are any, for closed-test
   feedback. If startup itself fails, a screen explains that the save is safe and shows the report
   instead of a blank page.
   Run 7 (backlog #1): **Lucky Orbit streak.** Using the free spin on consecutive days builds a streak,
   shown as seven dots under the wheel. Every 7th day in a row the free spin is a Golden Orbit: the
   wheel glows, prizes are doubled (Stardust, Hyperdrive minutes, crystals; a comet also brings 15
   minutes of production) and the jackpot weight goes from 2 to 12. Ad spins never count. Missing a
   day restarts the streak at 1.
   Run 8 (backlog #1): **Rating prompt.** On the phone only, a few seconds after a happy moment (a
   collapse, a Golden Orbit or the jackpot slice), the game may ask for a Google Play rating. It waits
   until the player has played for 2 days and at least an hour, asks at most once per 30 days and 3
   times in total, and "Don't ask again" stops it for good. Rating is never rewarded (Play policy).
   It opens the store page; the native In-App Review API is a later upgrade because it needs a
   Capacitor plugin. Settings also has a "Rate on Google Play" button on the phone.
   Run 9 (backlog #1, part 1): **Spanish and Portuguese.** Text is looked up by its English wording
   (`t()` in `src/i18n/`), so anything untranslated stays English. Translated so far: the main screen,
   hints, the Build tab, all 14 generators, stage names, Settings, the welcome-back and reminder
   dialogs and the rating prompt. Settings has a Language picker (Device language, English, Español,
   Português); picking one reloads the page. "Device language" stays English until a language is
   complete (`AUTO_LANGS`), so nobody gets a half-translated game by surprise; Settings says "Some
   text is still in English" meanwhile. The Play listing is translated in `docs/STORE-es-pt.md`
   (es-419 and pt-BR).
   Run 10 (part 2): all 155 upgrades and 132 achievements, plus the Upgrades and Trophies tabs.
   Generated text such as "Quantum Lunar Base" carries a recipe (`nameP`/`descP`: an English template
   and its parts) so each language can order the words its own way; tier names are worded to avoid
   gender agreement ("Salto cuántico: Base Lunar"). Big numbers in achievement goals use the game's
   short form (1M). `npm run i18n` lists data text still missing; a test fails if any upgrade or
   achievement lacks Spanish or Portuguese. Also fixed: the Trophies summary showed its "+25%" in a
   box because a Warp Exchange style shared the class name.
   Run 11 (part 3): the Cosmos tab (collapse, all 21 cosmic upgrades, the 6 anomalies and their
   dialogs), the Probes tab (4 destinations, 6 relics) and all 34 news headlines. A test checks every
   one of them has both languages.
   Run 12 (part 4): the Goals window (missions, the weekly contract, the Star Pass card and screen),
   the Boosts window (Lucky Orbit wheel and its streak, Hyperdrive, Tap Frenzy), the daily supply
   drop and the stats screen. `npm run i18n` now also checks every `t('...')` call in the code, and
   both languages cover all 658 keys it finds. A test covers the wheel slices and contracts.
   Run 13 (part 5): Quasar Crystals, the Nebula Garden, the Star Forge and the Warp Exchange, with
   their spores, spells, goods and toasts. The Warp Exchange is "Intercambio Warp" / "Bolsa de Dobra"
   everywhere (the stats row had drifted). A test covers spores, spells and goods.
   Run 14 (done): the weekend event, the shop, the starter offer and the browser ad stand-in. A scan of
   every tab and window in both languages finds no English left, so `AUTO_LANGS` is now `['es', 'pt']`:
   phones set to Spanish or Portuguese start in that language, everyone else gets English, and Settings
   still lets anyone pick. The "Some text is still in English" note is gone.

## Research log

**Run 1 (Oct 10, evening).** Sources: CrazyGames' clicker monetization guide, GameAnalytics and Adjust
idle-game guides, AdVenture Capitalist and Egg, Inc. reviews.
- Reviews of AdVenture Capitalist and Egg, Inc. keep naming the same weakness: goals feel shallow and
  progress repetitive. Egg, Inc. answers with a rolling set of missions. **Built: Missions** (three at
  a time, each worth minutes of production, achievements at 1/10/50/150/400, swap one with a rewarded ad).
- Rewarded ads that boost currency or speed up time convert best; a "welcome back" double and a
  temporary tap or auto-click boost are the top two placements. Welcome-back double is built. **Built: Tap
  Frenzy** (rewarded: 60 s of 20 auto-taps a second at x10 per tap, 5 minute recharge), next to
  Hyperdrive in a new Boosts window.
- Interstitials hurt retention most; keep them at natural pauses only (already true: after collapse
  or anomaly entry, paced).
- Daily task lists and login streaks are standard retention; streak exists, missions now cover tasks.

**Run 2 (Oct 11, morning).** Sources: AdVenture Capitalist wiki and Steam threads, GameAnalytics,
Countly and Kwalee notes on push notifications, a PocketGamer.biz chart on opt-in rates.
- AdVenture Capitalist's speed boosts at 25/50/100 owned are its main pacing hook. **Skipped:** our
  tier upgrades already unlock at 1/5/25/50/100/150/200/250 owned, so adding automatic doubles would
  stack on top and wreck the Dark Matter pacing.
- Players who allow notifications keep playing far more often (vendor figures: 55% vs 29% retained in
  month one). The advice is to notify only on real events, rarely, and to ask at a good moment.
  **Built: Reminders**: storage full (offline cap reached), Hyperdrive ended, probe returned, daily drop
  waiting at 6 pm. At most one of each, never under 10 minutes away, cleared when the app opens. One
  soft ask after the first long absence, and a Settings toggle. Phone only.
- An offline storage cap creates the "come back" pull; ours is 8 hours, raised by Cosmic upgrades.

**Run 3 (Oct 11, evening).** Sources: Egg, Inc. wiki (Contracts), Antimatter Dimensions Steam
threads and review summaries.
- Egg, Inc. contracts are time-limited goals with up to three reward tiers, the last one the most
  valuable. **Built: Weekly contracts.** One themed goal a week (Comet Season, Tap Marathon, Busy Fleet,
  rotating), three tiers worth 30 min, 90 min and 4 h of production, and the top tier awards a Contract
  Medal: +5% production forever, kept through collapses. Achievements at 1, 4 and 10 medals. Lives at
  the top of the Missions window; the missions badge counts claimable tiers.
- Antimatter Dimensions players complain most about waiting without automation, and value autobuyers
  more when they arrive late. **Next:** a late Cosmic upgrade that auto-buys generators.

**Run 4 (Oct 12, morning).** Sources: Idle Miner Tycoon guides on managers, run 3's Antimatter
Dimensions notes.
- Idle Miner Tycoon's managers (automation) are the feature players credit most: income keeps coming
  without constant tapping, leaving time for decisions. Automation feels best when it arrives after the
  player has done the work by hand. **Built: Auto-Fabricators**, a 60 Dark Matter Cosmic upgrade below
  Constellation Map. Once a second it buys the generator with the shortest payback, as long as it is
  affordable; upgrades stay manual. An Auto switch sits on the Build tab's buy row.
- Fixed a drawing crash on large planets (a continent at the planet's edge got a negative width).

**Run 5 (Oct 12, evening).** Sources: Idle Planet Miner review summaries and its subreddit, the
Cookie Clicker wiki (minigames, sugar lumps).
- Space idle games are praised for the core loop but criticised for a grindy late game and intrusive
  ads. Our ads stay opt-in apart from paced break ads; late-game goals now come from anomalies,
  contracts and the new crystals.
- Cookie Clicker's sugar lumps are a slow real-time resource (about one a day) that levels buildings
  for good, giving a reason to open the game daily long after the main loop is solved. **Built: Quasar
  Crystals.** Unlock at 1 billion lifetime Stardust; one forms every 20 hours, even while away; each
  generator level costs level + 1 crystals and adds +5% to that generator, kept through collapses. A
  rewarded ad grows the current crystal 2 hours sooner (once per crystal). Achievements at 1, 10 and 40
  total levels. Opened from the crystal counter on the Build tab.

**Run 6 (Oct 13, morning).** Sources: Cookie Clicker wiki (Garden, Minigames), AdVenture Capitalist
Wikipedia page and Steam discussions on events.
- Cookie Clicker's garden opens when the Farm reaches level 1 with a sugar lump and grows from a 2 by 2 to
  a 6 by 6 bed with more levels; crops grow in real time and unlocked seeds survive ascension. It gives
  crystal levels a purpose beyond a flat bonus. **Built: Nebula Garden.** Levelling the Nebula Refinery to
  1 with a Quasar Crystal opens it: 4 plots, two more per level up to a 3 by 3 bed. Three spores trade
  time for reward (Star Moss 5 min for 1.5 min of production, Comet Bloom 1 h for 12 min, Void Orchid
  8 h for 90 min), all scaled by the Refinery's level bonus. Plants grow while away and survive
  collapses. Harvest and replant in one tap; a rewarded ad (Fertilizer) grows every plant 2 hours, once
  every 4 hours. Achievements at 1, 50 and 500 harvests. Opened from the sprout chip on the Build tab.
- AdVenture Capitalist runs weekly limited-time events as temporary planets with their own currency and
  leaderboard rewards; players spend premium currency to finish them in time, while permanent planets
  wait. Our weekly contracts cover the goal side. **Next:** a weekend "event sector", a short separate
  economy with its own generators whose reward is Contract Medals or crystals.

**Run 7 (Oct 13, evening).** Sources: an AppGamer guide to Idle Miner Tycoon events, the Egg, Inc.
wiki (version history: time-limited global boosts and sales), run 6's AdVenture Capitalist notes.
- Idle Miner Tycoon events last 3 to 4 days, are themed, and pay tiered badges (participation, bronze,
  silver, gold) with better rewards at higher tiers. **Built: Weekend events.** Friday to Sunday (local
  time), once the player has earned a million Stardust. A rotating theme (Solar Flare Weekend, Ion
  Storm, Meteor Bazaar) with its own currency, Flux: tap the rift, buy four event generators (cost
  growth x1.25), and Flux keeps flowing while away. Badges by Flux earned: Bronze 50K, Silver 100M,
  Gold 5B, paying 30 min, 2 h and 6 h of production; Gold also gives a Contract Medal. A rewarded ad
  adds 10 minutes of Flux, every 2 hours. Pacing simulated: checking in hourly wins Gold on day 2,
  every 6 hours on day 3, twice a day reaches Silver. Everything is wiped when the weekend ends.
  Achievements at 1, 3 and 8 Golds. Opened from a rift button at the top left of the sky.
- Egg, Inc. added time-limited global boosts and sales. **Next:** a "double weekend" variant where a
  rewarded boost lasts twice as long during events.

**Run 8 (Oct 14, morning).** Sources: Cookie Clicker wiki (Grimoire).
- The Grimoire is Cookie Clicker's second building minigame, opened by levelling Wizard Towers with a
  sugar lump. Magic refills over time and its cap grows with the building; spells summon golden
  cookies or buffs, and the strongest can backfire. It rewards active play, where the garden rewards
  coming back. **Built: Star Forge.** Levelling the Star Forge to 1 lights it: 50 heat (+10 per level)
  that refills from empty in 2 hours, even while away. Four forgings: Smelt Stardust (20 heat, 20 min
  of production, 10% of melts fail), Comet Lure (25, a comet now), Overclock (35, production x7 for
  30 s) and Supernova Strike (30, taps x777 for 13 s). A rewarded ad refills the forge, once every 4
  hours. Achievements at 1, 25 and 250 forgings.
- Minigames moved to their own row at the top of the Build tab (Nebula Garden and Star Forge cards
  with live status), and the buy row now shares its width when crystals and Auto are both shown.

**Run 9 (Oct 14, evening).** Sources: playio and GameAnalytics notes on battle passes, PocketGamer.biz
on season passes in idle games, Idle Miner Tycoon's monthly pass.
- Season passes earn 10 to 40% of revenue in top free-to-play games, and idle games run them monthly.
  They pay off because free players progress too, so the premium track is a visible upgrade, not a
  paywall. **Built: Star Pass.** A 4-week season with 30 tiers of 250 XP. XP comes from what players
  already do: missions (20), daily drops (25), contract tiers (40), event badges (40), collapses (60),
  comets (3), forgings (3) and harvests (2). Free track: minutes of production each tier, a crystal
  every 5th tier, a Contract Medal at 30. Premium ($4.99 per season): double production rewards, 2
  crystals every 3rd tier, medals at 10 and 20, and the Aurora planet skin at 30, which is not sold
  anywhere else. Lives at the top of the Goals window (renamed from Missions) and in the Shop.
- Egg, Inc.'s global boost events. **Built: Double weekends.** Hyperdrive and Tap Frenzy last twice as
  long while a weekend event runs; the Boosts window says so.

**Run 10 (Oct 15, morning).** Sources: Cookie Clicker wiki (Stock Market), a GamePretty stocks guide,
Galactic Civilizations' trade-route notes.
- Cookie Clicker's Stock Market is its third building minigame, opened by levelling the Bank. Goods tick
  every minute around a resting value, profit is counted in seconds of production, and the Office adds
  warehouse space. It is the minigame for players who like to watch and time things, where the garden
  rewards coming back and the forge rewards bursts. Trade routes (the backlog idea) would have repeated
  Expeditions, so the market won. **Built: Warp Exchange.** Levelling the Warp Gate to 1 opens it: four
  goods (Comet Ice rests at 8, Iridium Ore 20, Neutron Plasma 50, Antimatter 120 credits, each more
  volatile than the last) priced in seconds of base production. Prices move every 10 minutes, even
  while away (up to a day caught up), drift toward rest, and sometimes catch a rumour that pushes one
  good up or down for a while. The hold is 50 of each good, +25 per level. Only profit counts toward
  Stardust earned. A rewarded ad (Insider tip) lifts the good furthest under its resting price for an
  hour, once every 4 hours. Achievements at 1, 25 and 200 profitable sales, which also earn Star Pass XP.
  Each good shows a sparkline of the last six hours.
- The minigame row now fits three cards: Garden, Forge and Market with short live status.

**Run 11 (Oct 15, evening).** Sources: Egg, Inc. wiki (spaceships, artifacts, piggy bank), an
Antimatter Dimensions review summary, run 10's market notes.
- Egg, Inc.'s artifacts are the collection layer its late game hangs on; our Expedition Relics already
  fill that role, so nothing new there. Antimatter Dimensions reviews praise layered progression but
  call the slow start and end its weakness; a daily reason to open the game helps both ends.
- Daily prize wheels are the most common daily hook in mobile idle games and one of the best-accepted
  rewarded-ad spots, because the first spin is free and the ad only buys more. **Built: Lucky Orbit.**
  A prize wheel at the top of the Boosts window: one free spin a day and two more with an ad. Eight
  slices: 15 min, 45 min, 1 hour and 2 hours of production, 30 minutes of Hyperdrive, a comet, a Quasar
  Crystal (2 hours of production before crystals open) and a rare 8-hour jackpot. The Boosts button
  shows a dot while the free spin waits.
- From the backlog: **Built: sell-off before collapse.** Warp Exchange goods are now sold automatically
  when the universe collapses or enters or leaves an anomaly, before Dark Matter is counted, so their
  profit adds to it. The collapse dialog says how much they will fetch.

**Run 15 (Oct 16, evening). Built: welcome-back summary.** The Welcome back window now lists what
each real-time system did while the player was away, under the Stardust total: probes back with loot,
plants ready to harvest, Quasar Crystals formed, a full Star Forge, the profit or loss on goods held at
the Warp Exchange, event Flux earned and hours saved in the Stardust Vault. Only lines with something to
report show. `core/away.ts` brings each system up to date once (so a crystal is reported here instead of
in a second toast) and a test covers it. Translated into Spanish and Portuguese.

**Run 16. Built: Spanish and Portuguese store screenshots.** `tools/store-shots.mjs` takes a language
(`en`, `es` or `pt`), opens the game with that phone locale so it starts in that language, and writes the
same 8 shots with translated captions. The es-419 and pt-BR sets are in the project files under
`store/es-419/` and `store/pt-BR/`, and STORE-es-pt.md says where to upload them.

**Run 17. Pacing re-check and save hardening.** `tools/simulate.mjs` still gives the first Dark Matter
at 1h 24m and the first collapse at 3h 54m, with each later universe shorter (2h 53m, 2h 2m, 1h 25m,
then under an hour by the sixth), so the systems added since run 3 needed no rebalancing; the bot does
not use crystals, the garden, the wheel or daily rewards, which only speed things up. A fuzz over every
save field found that a list or record of the wrong type (for example `"buffs": null` from a damaged
save or a hand-edited import) stopped the game at start-up. Loading now puts the default back for any
list, record, text or flag of the wrong type and drops malformed buffs, expeditions and missions. A
test corrupts each field in turn (7 bad values, 2 levels deep) and checks the save still loads and plays.

**Run 18. Low-end performance re-check.** With a late-game save (12 generator types, minigames, probes)
every tab holds 60 fps at full CPU speed, and script plus style work stays near 2 ms a frame. With the
CPU slowed 6x in a headless browser, the Build tab runs at about 15 fps and other tabs at 30; nearly
all of that is software painting, which a phone's GPU does instead, so it overstates the cost. One
waste was found and fixed: the slow refresh re-set the same `hidden` flags (daily gift, missions badge,
tab badges, minigame cards, the Auto chip) about 25 times a second, each one a DOM change. `setHidden`
now writes only when the value changes, so an idle screen makes no DOM changes at all.

**Run 19. Golden Halo.** A long-term goal for the daily wheel: a free-spin streak of 28 days (the
fourth Golden Orbit in a row) earns the Golden Halo, two golden sparks on a tilted orbit around the
celestial body, each with a fading trail. The far half of the orbit passes behind the body. It is
earned once, turns on at once with its own toast, and the Shop's skins card has a Show/Hide button
for it (before it is earned, the card says what earns it). The wheel says how to earn it until then.
It is looks only and works with every skin. Spanish and Portuguese text added; a test covers the
28th day, ad spins not counting, earning it once, the off switch sticking, and older saves.

**Run 20. Reduce motion.** Settings has a Reduce motion switch, and the phone's own reduce-motion
setting turns on the same behaviour. With it, the sky never flashes white on a new stage, the body
does not squash on a tap, and stars, drones and the Golden Halo move at a third of the speed. The
universe collapse dims and returns instead of a bright flash, and the pulsing and bobbing buttons,
the garden glow and the spinning rift stand still. A media-query rule that never applied to the
garden, event and rift animations (an equal-specificity rule further down won) now does.

**Run 21. Play Console product list and touch targets.** The Play Console setup table in
`docs/RELEASE.md` was missing `star_pass`, so Star Pass Premium would have failed to buy at launch if
the products were created from that table. It is listed now, and a test fails if any Shop product id
is missing from the table. A tap-size scan found the modal close button (36 px), Shop price buttons
(34 to 38 px), the purple Cosmos buttons and dialog buttons under Android's 48 px guideline; each now
has an invisible hit area grown to 48 px, so they look the same but are easier to hit.

**Run 22. Text contrast.** A new check, `tools/contrast-check.mjs`, measures text contrast against
WCAG AA (4.5:1, or 3:1 for large text) on every tab and window, top and bottom. Four things failed and
are fixed: the big owned count on generator cards (2.9:1), text on generators you cannot afford yet
(their 62% fade took prices and captions to 3.0:1), the same fade on event generators, and white on
the red Erase button (3.8:1). Cards now fade to 86% and the count and button colours are adjusted;
everything passes. Unaffordable cards still read as unaffordable from their red price and plain border.

**Run 23. Teen ad cap and a 48-hour pacing check.** The Play listing's audience includes 13 to 15
year olds, so AdMob now starts with the maximum ad content rating set to Teen; `docs/STORE.md` says to
set the same cap in the AdMob console. The Android back button and pause/resume were checked and were
already handled. A 48-hour run of the pacing bot (non-stop play, 3 taps a second) reached all 14
generators by 11.5 hours, 16 universes and 112 achievements. Universes 7 to 13 each took under an hour
(the Dark Matter bonus doubles each time), then runs lengthen to 8 to 12 hours. Real players are away
most of that time, so this spreads over several days of play; balance is left as it is for launch, and
the fast middle stretch is the first place to look if launch data shows players finishing too soon.

**Run 24. Keyboard and switch access.** A replay of a new player's first minutes found nothing in the
way (the hints are tap-through and step aside after the first drone). A keyboard pass found three
problems: dialogs opened without moving focus, so Tab and screen readers stayed on the game behind
them; the Settings switches showed no focus at all, and focusing one scrolled the dialog to the
bottom because its hidden checkbox sat outside its row. Dialogs now take focus when they open, keep
Tab and Shift+Tab inside, and hand focus back to the button that opened them. Every button, link,
select and switch shows the same cyan focus ring.

**Run 25. Store screenshots refreshed.** All 24 Play screenshots (English, Spanish and Portuguese)
were remade from the current build, so they show this week's contrast and layout fixes. The
screenshot tool now hides tutorial hints (a "Tap the comet" bubble sat over the sky in two shots),
shows the Golden Halo around the late-game star, and opens the Boosts shot on day 7 of a spin streak,
so the wheel appears as a Golden Orbit with a full row of streak dots.

**Run 26. Screen reader roles.** Chrome's accessibility tree showed the bottom tabs with no selected
state, the x1/x10/x100/Max buttons with no pressed state, and the big Stardust number with no label.
Tabs now carry `aria-selected` and point at their panels (`role="tabpanel"`), the buy-amount buttons
carry `aria-pressed`, and TalkBack reads "Stardust: 47M" for the counter. A new `setAttr` helper
writes these only when they change, so the idle screen still makes no DOM changes.

**Run 27. Tier progress bars.** AdVenture Capitalist's best-loved pacing cue is the bar on each
business showing how close you are to the next milestone. Our tier upgrades already unlock at set
owned counts (1, 5, 25, 50 ... 250; Mining Drones use 1, 10, 25 ...), but nothing on the Build tab said
so. Each generator card now has a thin cyan-to-gold bar that fills toward the count where its next
upgrade unlocks and resets after it; it disappears past 250. A test walks every generator from 0 to
250 owned and checks each bar ends exactly where an upgrade really unlocks. The bar is only redrawn
when the owned count changes.

**Run 28. Buy all upgrades.** Mid-game the Upgrades tab often lists ten or more cheap upgrades
after a return from offline, and tapping each one is busywork (Cookie Clicker and Idle Miner both
offer a buy-all). A "Buy all (N)" button now sits beside the Available heading whenever two or more
upgrades are affordable together. It buys cheapest first until the next one is out of reach, plays
one sound and shows "Bought N upgrades". The count is a dry run of the same order, so the label
matches what a tap does; a test checks that and that it stays hidden in the no-upgrades anomaly.

**Run 29. Auto-Researchers.** Run 4 left upgrades manual on purpose, and Antimatter Dimensions
players value automation most when it arrives after they have done the work by hand. By the late
game, though, buying upgrades is pure upkeep after every collapse. A new 250 Dark Matter Cosmic upgrade
below Auto-Fabricators makes the fabricators also buy every affordable upgrade each second, cheapest
first (reusing run 28's buy-all), before they buy generators. The same Auto switch on the Build tab
turns both off, and anomalies that forbid upgrades still forbid them. A test checks that the
fabricators alone leave upgrades alone.

**Run 30. "Next" buy amount.** AdVenture Capitalist's buy toggle has a "Next" setting that buys
exactly enough to reach the next milestone, and with run 27's tier bars showing the target it was
the obvious missing step. The Build tab's buy row is now x1 / x10 / x100 / Next / Max; Next prices
each card for the count that lands on its next tier upgrade (21 Harvesters shows x4) and falls back
to one at a time past 250. The chips now share the row's width so the crystal and Auto chips still
fit at 360px, and the "Buy" label steps aside when crystals are shown (the row keeps its spoken label).
A test walks 0 to 250 owned and checks Next always lands on a tier.

**Run 31. Tap target sweep.** Play's pre-launch accessibility report flags touch targets under 48 dp.
A script now opens every tab and window at 360px (Build, Upgrades, Trophies, Cosmos, Shop, Stats,
Settings, the event, Goals, Boosts and Crystals windows) and lists anything under 44px that has no
invisible hit extender. Two were found, both recent: the Upgrades tab's Buy all button (40px, now 44
plus an extender) and the Privacy policy link in Settings (15px tall text, now padded to a 47px target
without moving the text). The seven 13px checkboxes it lists sit inside their full-width toggle
rows, which are the real targets. A full Portuguese pass over every screen showed no missing strings
and no errors after runs 28 to 30.

**Run 32. Coming up.** Cookie Clicker's store shows the next upgrades before they can be bought, which
gives every purchase a visible "almost there". The Upgrades tab now ends its Available list with a
"Coming up" section: the next locked tier upgrade for up to three owned generators, closest to
unlocking first, each with "Orbital Station: 4 of 5" and the same cyan-to-gold bar as the Build tab.
Generator upgrades now carry their unlock count as data (`need`) instead of only a closure, so the
list cannot drift from the real unlocks; a test checks the order and that unlocked ones move up to
Available. Hidden in anomalies that forbid upgrades.

**Run 33. Performance re-check after runs 28 to 32.** Same late-game save as run 18, CPU slowed 6x.
With the Auto switch off, an idle screen still makes no DOM changes on any tab, so Buy all's count and
the Coming up list (both recomputed every refresh) are cached correctly; the three upgrade helpers
together cost about 0.04 ms per refresh. With Auto-Fabricators and Auto-Researchers running, each
purchase updates the bought generator's row (owned count, price, tier bar) about once a second, which
is the intended feedback. Frame times are 30 fps on the Upgrades tab and 20 to 30 on Build at 6x
throttle, a little better than run 18, and still mostly software painting of the sky. Nothing to fix.

**Run 34. What a collapse is worth.** Egg, Inc. and AdVenture Capitalist both show the prestige
bonus you would end up with, not only the currency, because "+18 Dark Matter" means little without
knowing what you already have. Under "Collapse now for" the Cosmos tab now reads "Bonus +24% → +60%
(x1.29)": the production bonus now, after collapsing, and the ratio. It turns gold at x2 or more, a
gentle hint that the run has paid off. The Dark Matter percent now comes from one function shared with
the Cosmos card (it was worked out twice), and a test covers the ratio and the Resonance upgrades.

**Run 35. Store screenshots refreshed, and two translation gaps closed.** All 24 Play screenshots
(English, es-419, pt-BR) were regenerated so they show the Next buy chip, Buy all and the collapse
bonus line. Reviewing the Portuguese set turned up a real bug: comet pop-ups ("Supernova Tap! Taps x777
for 13s") were built as English text in the game logic and shown as is, so Spanish and Portuguese
players saw English on every comet. The same was true of all four phone reminders (storage full,
Hyperdrive ended, probe returned, daily drop), which are the only text players see outside the app.
Comet results now carry their duration and the app words them with `t()`; reminders carry their
sentences with values and are translated just before scheduling. 17 strings added in both languages,
and a test fails if any reminder sentence lacks a translation.

**Run 36. Translation sweep.** Following run 35, every capitalised sentence in the game logic, data
and UI code was checked against the Spanish and Portuguese dictionaries, and every `toast()` call was
read for text that skips `t()`. Nothing else was shown untranslated. Three leftovers were English text
that is never shown (an old mission describer, garden seed blurbs, and the comet results' English
title and detail, replaced in run 35), so they were deleted rather than translated. A new test scans
`src/core` and `src/data` for any sentence without both translations, so the next one fails CI instead
of reaching players. A full Spanish pass over every screen, and catching comets in Spanish, showed
only Spanish text.

**Run 37. Random-tap stability check.** Six sessions of 500 random taps each, three from a fresh game
and three from a late save with every system unlocked, produced no page errors. Every number stayed
finite and each save reloaded to the same state. The only console message was the browser refusing
vibration before the first tap, so the web build now skips vibration until the player has tapped.

**Run 38. Almost there.** The Trophies tab only showed a grid of locks, so players had no idea which
achievement was next. Most idle games point at the nearest goal, so the tab now opens with up to
three unearned achievements closest to done, each with its description and a progress bar (also
announced to screen readers). Every counted achievement (20 families, 153 in all minus the secret
ones) now carries its goal and current count. Progress is plain count over goal, since a log scale
made 659 of 1,000 per second look 94% done. A test checks the order and that a full bar always
matches the achievement's own check.

**Run 39. New trophy badge.** Earning an achievement only showed a toast, so a player who missed it
had no reason to open Trophies. The Trophies tab now shows the same red dot as Upgrades whenever
achievements were earned since it was last opened, and opening the tab clears it. Older saves count
everything already earned as seen, so updating players don't get a stale dot. A test covers that
migration, and a Playwright run confirmed the dot appears on a new achievement and clears on opening.

**Run 40. Pacing re-check after runs 28 to 39.** `tools/simulate.mjs` at 3 taps per second still
gives the first Dark Matter at 1h 24m and the first collapse at 3h 54m, the same as run 17, so Buy
all, the Next amount and the trophy features changed convenience but not pacing (Auto-Researchers
costs 250 Dark Matter, far past the first universes). Working out the Trophies tab's nearest
achievements costs about 0.02 ms per refresh.

**Run 41. Performance re-check after runs 38 and 39.** Same late-game save, CPU slowed 6x. An idle
Trophies tab makes no DOM changes, so the Almost there list is cached correctly, and frame times are
unchanged (Upgrades about 60 fps, Build 20 to 30). **Tried and dropped:** making achievement toasts
open Trophies on tap. Toasts sit over the sky and pass taps through to it on purpose, so a tappable
toast would steal taps from players tapping fast, and a stray tap would jump them to another tab.
The new Trophies dot already does that job.

**Run 42. Release notes.** Play asks for "What's new" text with every release, including the first
closed test, and the listing docs had none. `docs/STORE.md` now has first-release notes in English,
Spanish (Latin America) and Portuguese (Brazil), in the tagged format the Play Console accepts,
using the same names for features as the game (Ráfaga de Polvo Estelar, Bolsa de Dobra and so on).
A copy is in `store/release-notes.txt`, and a test keeps each language under Play's 500 characters.

**Run 43. Brazilian number format.** Portuguese text wrote whole numbers the Brazilian way
(1.000 for a thousand) while prices and rates kept the English decimal point (2.5K), so the same
screen read 1.000 as a thousand and 2.5 as two and a half. Brazil writes two and a half as 2,5, so in
Portuguese every short number, percentage and decimal now uses a comma (2,5K, 0,6%, 1,2/s) and
thousands keep the dot. English and Spanish (Latin America uses the point) are unchanged. Six
places that wrote decimals directly (vault hours, market prices, the collapse multiplier) now use
one helper. The Portuguese store screenshots were regenerated, and a test covers all three
languages.

**Run 44. Release checklist.** Three things would have gone wrong silently at upload. The privacy
policy link in Settings and in the Play listing points at `docs/PRIVACY.md` on `main`, which returns
404 until this branch is merged, and Play rejects apps whose policy page is missing. Play's version
name came from `package.json` (0.1.0) while Settings showed 1.0.0; both are now 1.0.0, with a test
keeping them equal. And a signed bundle could be uploaded still showing test ads. A new
`tools/preflight.mjs` (run on every Android build, warnings only) flags test-mode ads, Google's test
AdMob IDs, a version mismatch and an unreachable privacy policy. Warnings only, because the closed
test can run on test ads while AdMob reviews the app.

**Run 45. Evolution moment.** The celestial body's seven forms (asteroid to black hole) are the
game's most visible progress, but growing into the next one only flashed the sky, and nothing said
when the next form comes. Now each evolution gets a toast ("Evolution! Asteroid → Moon"), the
achievement sound and a medium buzz, plus how much Stardust this universe the next form needs
("This is the final form." at the black hole). It fires on growth only, never on loading a save, and
again in each new universe after a collapse. Checked in English and Portuguese with no page errors.

**Run 46. Stability re-check and a storage-full note.** Four more sessions of 500 random taps (two
fresh, two late game) after runs 38 to 45 gave no page errors, finite numbers and clean reloads.
The welcome-back screen never said that offline earnings stop at the storage cap (8 hours at first),
so a player away for 12 hours saw 12 hours and an amount worth 8. It now adds "Storage filled up
after 8 hours." when the cap was hit, plus "Cosmic upgrades let it hold more." until the 24-hour
upgrade is owned, which points at the Event Horizon Cache and Timeless Engines nodes.

**Run 47. Contrast re-check.** `tools/contrast-check.mjs` re-run over every tab and window after the
new Trophies list, evolution toasts and storage note. Its only failures were false alarms, which it
now skips: event badge labels (Bronze, Silver...) hang below their 2-pixel marker line, and the check
had measured them against the line itself; and toasts caught half-faded behind a window. The check now
ignores parent backgrounds that don't sit behind the text, hides toasts while scanning, and also
covers the welcome-back window. Everything passes WCAG AA, and a planted dark label is still caught.

**Run 48. Next form in Stats.** Following run 45's evolution toast, Stats now has a "Next form" row
under Earned this universe: the next form, the Stardust it needs this universe and how far along you
are ("Rocky Planet at 100M (34%)"), or "Final form reached" at the black hole. Translated, and checked
in English and Portuguese.

**Run 49. Large screens and split screen.** Play builds target API 36, and Android 16 ignores the
portrait lock on tablets and foldables, so the game must work in any window shape. Checked at
1280x800, 960x600, 800x1280, 673x841, 1280x400 and 400x900 with no errors or sideways scroll. One
real gap: a short landscape window under 860px wide (split screen on a tablet, 640x400) hid the
whole shop under the sky. Landscape windows from 560px wide now put the shop beside the sky, half
and half below 860px. Also removed two stray test screenshots from the repo root.

**Run 50. Large system font sizes.** Android's font size setting zooms every bit of text in the
app's WebView, up to 200% on Android 14 and later. Emulated in Playwright at 360x640: at 130% every
tab still works (names wrap, nothing hides), but at 200% the header and tap hint fill the sky, the
Buy chips overflow and the whole generator list is pushed off screen. The Android build now caps the
WebView's text zoom at the player's setting or 130%, whichever is smaller (`tools/android.sh`
writes the cap into `MainActivity`), so larger settings still get bigger text without breaking it.

**Run 51. Tablet screenshots.** Following run 49's large-screen check, the Play listing now has
tablet screenshots: the same eight shots and captions as the phone set, at 1920x1080, showing the
side-by-side layout, in English, Spanish and Portuguese (`store/tablet/`). Play needs these before
it shows the game as designed for tablets. `tools/store-shots.mjs` takes a `tablet` option.

**Run 52. Google Play's in-app review.** The top backlog item, done without a new npm package: the
Android build now adds a small `InAppReview` Capacitor plugin (Java, written by `tools/android.sh`,
with Play's `com.google.android.play:review` library). After a happy moment (a collapse, a jackpot,
a Golden Orbit) and the same limits as before (two days and an hour of play first, 30 days apart,
three times at most), the game shows Play's own rating card over the game instead of our "Enjoying
Stardust Empire?" window and a trip to the store. Play's rules forbid asking a question first, so
the card appears on its own. Builds without the plugin keep the old window. The "Rate" button in
Settings still opens the Play page. Checked with a mocked plugin in Playwright, both paths.

**Run 53. Old WebView safety net.** The game is compiled for ES2020 and needs Chrome 80 or newer in
Android System WebView. A phone whose WebView was never updated would load the module, fail to parse
it, and sit on the splash screen forever, which reads as a crash (and counts as one in Play's
vitals). A tiny classic script in `index.html` now tests for the syntax first and, if it is missing,
hides the splash and says in the phone's language (English, Spanish, Portuguese) to update Android
System WebView and Chrome from Google Play. Checked by faking an old engine in Playwright.

**Run 54. Edge-to-edge on Android 15+.** Play builds target API 36, and apps targeting Android 15 or
later are drawn edge to edge: under the status bar, the camera cutout and the gesture bar. The
WebView's `env(safe-area-inset-*)` values do not reliably cover the system bars, so the header could
sit under the clock and the bottom tabs under the gesture bar. `MainActivity` (written by
`tools/android.sh`) now pads the game's view by the system bars and cutout, paints the space behind
them in the game's dark background, and keeps the bar icons light so they stay readable. Older
Android versions are unaffected (their insets arrive already applied).

**Run 55. Stellar Echoes, a late-game Dark Matter sink.** Startup on a 6x slowed CPU is about 1.2 s,
so nothing to do there. The 24-hour bot run showed a real gap instead: by about collapse 10 (some 14
hours of active play) every cosmic upgrade is owned, and Dark Matter piles up with nothing to buy,
while runs start getting longer. Stellar Echoes appear under the tree: each level multiplies all
production by 1.25, from 1,000 Dark Matter, doubling in price each level, so a player buys about one
per collapse. In the bot run they arrive from collapse 10 on and allow one extra collapse in 24
hours, without touching early pacing (first collapse still 3h 54m). Saved as `echoes` (old saves
start at 0), kept through collapses, translated, with a test.

**Run 56. Late-game check after Stellar Echoes.** Two more random-tap sessions (fresh and late game)
were clean. A late-game save with every achievement, upgrade and cosmic node is about 8 KB, so save
size is no concern. The contrast check now also covers the Cosmos tab with the tree complete and
Echoes buyable (passes). Buying the last cosmic upgrade now also shows "Stellar Echoes unlocked" so
players know where their Dark Matter goes next.

**Run 57. Comeback gift.** A 2026 retention guide names winning back lapsed players as one of the
main levers for day 7 and day 30 retention, and here a player who leaves for days gets nothing extra:
storage stops filling after 8 hours. Now a player who comes back after 3 or more days away (and has
played at least 30 minutes in total) gets 2 hours of free Hyperdrive, listed in the welcome-back
window as "Welcome-back gift". It is given at most once a week, stays within the 8 hour Hyperdrive
cap, needs no ad and is saved as `comebackAt`. Translated, with a test.

**Run 58. Comeback reminder.** For players who turned reminders on, leaving the game now also
schedules one more: on the evening the comeback gift becomes due (3 days later), "A gift is
waiting: come back for 2 hours of free Hyperdrive". It is skipped for players who barely played or
got a gift in the last week, and is cancelled like the others when the game opens. The reminder
opt-in text now mentions gifts. Translated, covered by the reminder test.

**Run 59. Share my empire.** Word of mouth is free installs, and the game had no way to show it
off. The Stats screen now has a "Share my empire" button. It shares one line, such as "My space
empire makes 1.2T Stardust per second and has collapsed 3 universes. Can you beat it?", with the
Google Play link. On the phone it opens Android's share sheet through a small `ShareText` plugin
written by `tools/android.sh`; in a browser it uses the Web Share API, or copies the line and says
so. Nothing is sent anywhere by the game itself. Also fixed: toasts fired while a window was open
(such as "Save code copied") were hidden behind it; they now show above it. Translated.

**Run 60. Check after runs 57 to 59.** Two random-tap sessions (fresh and late game) were clean
after the comeback gift and sharing. One fix: if a phone's clock was set far ahead and then back, the
last gift's date would sit in the future and block gifts for months; a future date is now ignored.
Covered by the comeback test.

### Backlog from research (best first)
(empty: launch readiness first, then new ideas from research are added here)
