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
   still lets anyone pick. The "Some text is still in English" note is gone. French followed in runs
   62 to 64.

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

**Run 61. "What's new" after updates, and a performance re-check.** Updates after launch need a
way to tell players what changed, or new features go unnoticed. Saves now record the app version
they last ran on (`versionSeen`). When a player opens a newer version, a "What's new" window lists
the lines from `src/data/changelog.ts` for every version since, once; new players never see it. The
list is empty for 1.0.0, and `docs/RELEASE.md` now has the steps for later releases. A test checks
version ordering and that every changelog line has Spanish and Portuguese. Performance with a
late-game save and the CPU slowed 6x is unchanged since run 41 (Upgrades 60 fps, Build about 20
fps in headless software rendering; the profile is almost all drawing, with game code under 5%).

**Run 62. French, part 1.** The contrast check still passes with the new windows (What's new,
sharing, the comeback gift). With Spanish and Portuguese done, French is next: France, Belgium,
Switzerland, Quebec and French-speaking Africa, with high ad rates in Europe and Canada. It is built
the same way, in `src/i18n/fr.ts` and `fr-data.ts`, with no-break spaces before ! ? : ; as French
typography wants and a comma for decimals. It stays out of Settings and device detection until every
string is done (`npm run i18n` tracks it: 141 of 857 so far, covering the main screen, the Build,
Upgrades and Cosmos tabs and Probes). Terms: Poussière d'étoiles, Matière noire, Hyperpropulsion,
Cristaux de quasar, Effondrer l'Univers, Échos stellaires.

**Run 63. French, part 2.** Every interface string is now in French: stats, boosts, the Lucky
Orbit, missions and contracts, the Star Pass, crystals, the Nebula Garden, the Star Forge, the Warp
Exchange, weekend events, the shop, ads, reminders, settings and the welcome-back window. What is
left is game data (upgrade and achievement names and descriptions, cosmic upgrades, anomalies,
relics): 521 of 857 keys done.

**Run 64. French, done.** The game data (upgrades, achievements, cosmic upgrades, anomalies,
expeditions, relics, news headlines) is translated, so French is complete (857 of 857) and switched
on: phones set to French start in French, Settings offers "Français", decimals use a comma, and the
old-WebView message has a French version. A scan of every tab and window in French finds no English
and no clipped text after one fix (the Asteroid Harvester is a "Broyeur d'astéroïdes", as
"Moissonneuse d'astéroïdes" was cut off on its card). The Play listing, release notes and screenshot
captions are in `docs/STORE-fr.md` and `tools/store-shots.mjs`; the 8 French screenshots are in
`store/fr-FR/` in the project files. The i18n tests now cover French too.

**Run 65. Check after French, and German, part 1.** Two random-tap sessions with the phone set
to French (fresh and late game) were clean. German is next: Germany, Austria and Switzerland have
some of the highest ad rates and a large Play audience. It is built like French, in
`src/i18n/de.ts` and `de-data.ts`, using "du" as German games usually do, and stays out of Settings
and device detection until every string is done (`npm run i18n`: 141 of 857 so far, the main
screen, Build, Upgrades, Cosmos and Probes). Terms: Sternenstaub, Dunkle Materie, Hyperantrieb,
Quasarkristalle, Universum kollabieren, Sternenechos. A trial scan in German found no clipped
buttons, but the Forge card already cuts "Schmiede" short; to fix before switching German on, along
with the decimal comma.

**Run 66. German, part 2, and small-phone shortcut cards.** Every German interface string is done
(521 of 857; game data is next). A wider scan for clipped text, in every language, found that the
Garden, Forge and Market shortcuts on the Build tab cut their status line short on 360-pixel phones
even in English ("Plots em…", "60/60 h…"). Below 420 pixels the status now gets its own full-width
line under a smaller icon, and below 340 pixels the icon is dropped; all five languages now fit at
360 pixels. German keeps "Schmiede" whole this way, and two German labels were shortened to fit
("Ziel" for the buy-to-next-tier button, "{n}/s je Stück · {pct} Anteil" on generator cards).

**Run 67. German, done.** The game data (upgrades, achievements, cosmic upgrades, anomalies,
expeditions, relics, news) is translated, so German is complete (857 of 857) and switched on:
phones set to German start in German, Settings offers "Deutsch", decimals use a comma, and the
old-WebView message has a German version. A scan of every tab and window in German finds no
English and no clipped labels, and two random-tap sessions with the phone in German were clean. A
new test checks that French and German cover exactly the same text as Spanish with the same
placeholders. Still to do: the German Play listing and screenshots.

**Run 68. German store listing, and squeezed text on phones.** The German Play listing, release
notes and screenshot captions are in `docs/STORE-de.md` and `tools/store-shots.mjs`; the 8 German
screenshots are in `store/de-DE/` in the project files. The release notes in every language now list
German (all under Play's 500-character limit). The German screenshots showed a real layout bug: in
the Boosts window the "Watch ad" button sat beside the description, and in French and German its
longer label squeezed the text into a one-word column (72 pixels wide) and pushed the button out of
view. On phones the button now sits under the text. A new scan for squeezed text in every window and
language found the same problem in the Shop (the vault line and the Golden Halo note in French);
those rows now wrap instead. French also gets a no-break space before %, so "+10 %" no longer splits
across lines. Housekeeping: stray scan screenshots that slipped into two earlier commits are removed
and ignored.

**Run 69. Day unit, and a performance re-check.** Countdowns such as "2d 23h" now use the
local day letter: "2j 23h" in French (jour) and "2T 23h" in German (Tag); hours, minutes and seconds
are the same symbols everywhere. Covered by the format test. Performance with a late-game save and the
CPU slowed 6x is unchanged after the French and German work and the layout fixes (Build about 20 fps
and Upgrades 60 fps in headless software rendering, as in run 61).

**Run 70. Store screenshots refreshed.** The layout fixes in run 68 changed the Boosts screenshot,
so all phone screenshots (English, Spanish, Portuguese, French, German) and all tablet screenshots
were remade; French and German tablet sets are new (`store/tablet/fr-FR/`, `de-DE/`). The store
folder in the project files now has a copy of every listing (`listing.md`, `listing-es-pt.md`,
`listing-fr.md`, `listing-de.md`) and `release-notes.txt` holds all five languages. The release-notes
test now also checks the French and German notes against Play's 500-character limit.

**Run 71. Save safety: unknown language.** A save check found a real start-up crash: the language
setting was used as-is, so a save naming a language this build lacks (a save code from a later
version with Italian, say, or an edited one) stopped the game from starting. An unknown setting now
falls back to the phone's language, then English. A test covers it, and a Playwright check loaded
saves with an unknown language, a bad number style, missing or empty settings and a wrong-typed sound
switch: the game starts in every case (the unknown language crashed before the fix).

**Run 72. Settings cleaned on load.** Following run 71, every saved setting is now checked when a
save loads: only known settings are kept, each must have the same type as its default (a sound
switch saved as text falls back to on), and the number style must be one the game knows. Missing or
empty settings give the defaults. A test covers it; the bad-save checks and a late-game random-tap
session were clean.

**Run 73. Save fuzz test.** Fed 10,000 damaged late-game saves (1 to 3 fields set to junk) through load, offline progress, five ticks and a reload. Two real gaps: negative balances such as dark matter or crystals stayed negative on load, and an edited save with a huge echo count made production Infinity. Load now resets any top-level number below its default, and the production and tap totals are capped at the largest double. The fuzz run now ends with 0 failures, and a unit test covers both cases.

**Run 74. Pacing for players who come and go.** `tools/simulate.mjs` only modelled non-stop play,
which no real player does. `SESSIONS=10,110` now plays 10 minutes, then earns offline progress for
the rest of the gap. Non-stop play is unchanged by run 73's production cap (first collapse 3h 54m,
and 5h 4m at half a tap per second). Ten minutes every two hours reaches the first Dark Matter at
10h and the first collapse at 1d 6h; ten minutes every four hours gets there on day 2. The bot skips
daily rewards, the wheel, ad boosts, crystals and the garden, so real players are faster than this.
That fits the genre (Egg, Inc.'s first prestige usually lands on day 1 or 2), so balance is unchanged.

**Run 75. First minutes in French and German, and long comet banners.** Playing the opening in
German and French found three things. French used "toucher" as a noun ("1 par toucher"), which reads
oddly; taps are now "appuis" everywhere ("1 par appui", "Frénésie d'appuis", "Appui supernova !"),
while instructions keep the verb ("Touchez l'astéroïde"). The comet banner ("Ruée de Poussière
d'étoiles !") ran off both edges of a 360 px phone; floating text in the sky now shrinks to fit and
stays clear of the edges. And trophy pop-ups covered that banner in the comet store screenshot, so
store shots now hide pop-ups on every shot. All 80 store screenshots (5 languages, phone and tablet)
were remade, and the French listing says "Appuis supernova x777".

**Run 76. Translated feature graphics, and checks after run 75.** The feature graphic is the
banner at the top of the Play listing, and it was English for every language. Play takes one per
translation, so `tools/feature-graphics.mjs` now renders it with the tagline in Spanish ("Toca.
Construye. Colapsa el universo."), Portuguese, French and German, shrinking the tagline when it would
pass the right edge (German 24 px instead of 26). The English one is byte-identical to the old file.
The first minutes in Spanish and Portuguese were clean, and performance with run 75's banner fitting
is unchanged (Build about 20 fps with the CPU slowed 6x in headless software rendering).

**Run 77. Save fuzz test in CI.** Run 73's fuzz check lived outside the repo, so a later change could
quietly bring back a broken load. `tests/save-fuzz.test.js` now runs 2,000 damaged late-game saves on
every `npm test` and CI run (about a second): each one must load or be refused as "not a save", then
survive offline progress, five ticks and a reload with no balance negative, NaN or Infinity. Undoing
run 73's fix makes it fail with the exact damaged fields, so it guards the right thing.

**Run 78. A week of short sessions, and play without tapping.** `SESSIONS=10,110` over 168 hours
(10 minutes every two hours, 3 taps a second) gives a steady first week: collapses on day 1, 2 and 3,
then each run shrinks (1d 6h, 1d 3h, 14h, 18h, 14h, 12h, 10h, 8h, 6h) while Dark Matter roughly
doubles each time, Research Echo lands on day 5 and five Stellar Echoes by day 7, with 106
achievements. Nothing stalls and nothing runs away, so balance is unchanged. The same sessions with
no tapping at all still reach the first Dark Matter at 12h and the first collapse at 1d 22h, so a
player who cannot tap quickly (or at all) can play the whole loop on generators and comets.

**Run 79. Damaged saves in the real game.** Run 77's test covers the game rules; this checks the
screens. `tools/ui-save-fuzz.mjs` writes a damaged late-game save (1 to 3 fields set to junk) into
the browser's storage, starts the game, then opens every tab, Stats, Settings and the Shop. 180 saves
over two seeds gave no page errors and every game started with a valid Stardust balance.

**Run 80. Recent universes.** Antimatter Dimensions' "past runs" list is one of its best-loved
screens: it shows each reset coming faster and paying more, which is the whole point of prestige.
Collapses now record the Dark Matter gained and how long the universe lasted on the game clock
(offline time included), newest first, up to 10 (`pastRuns`; old saves start empty, and damaged
entries are dropped on load). Stats ends with a "Recent universes" table: universe number, how long
it lasted, Dark Matter gained and Dark Matter per hour. Translated in all five languages; on a 360 px
phone the German and French headers wrap onto two lines while the numbers stay on one. A unit test
covers the order, the cap of 10 and the repair of bad entries.

**Run 81. When to collapse.** Following run 80, the Cosmos tab now compares this universe's Dark
Matter per hour with the last one's, under the collapse bar: "This universe: 6.8 Dark Matter per
hour. Last one: 1.5." Idle-game guides tell players to reset when that rate peaks; now the game
shows it instead of leaving it to a spreadsheet. It appears only after the first collapse and once
Dark Matter is pending. `darkMatterPerHour` and `fmtRateSmall` are shared with the Stats table, and a
test covers both. Translated in all five languages.

**Run 82. Hints for players who never tap, and a tidier collapse card.** Run 78 showed the game can
be played without tapping, but the first hint ("Tap the asteroid to harvest Stardust") stayed up
until five taps, and because the hints run in order it blocked every later one (buy a drone, catch
a comet, buy an upgrade, open Cosmos), even after the asteroid had become a star. It now shows only
in a brand-new game while the player has under 15 Stardust and no drone; a Playwright check with
zero taps now goes tap, buy, nothing, upgrade, as a tapping player does. The collapse card's
"Collapse now for +34 Dark Matter" row also wrapped mid-phrase in German and French; the amount now
moves to its own right-aligned line as a whole when it does not fit.

**Run 83. Release candidate check.** With runs 79 to 82 in, the whole regression set was run
again on the current build. Random-tap sessions in all five languages finished with no errors,
finite numbers and a clean reload; the contrast check over every tab and window found no text
under WCAG AA; the Build tab still renders at a median 50 ms a frame at 6x CPU slowdown; and 40
damaged saves loaded in the browser with no errors. The 80 store screenshots were remade so they
show the run 80 to 82 changes. The first shot had 18 taps on one spot, which stacked the
floating numbers into an unreadable smear; the script now spreads six taps around the rock so each
"+8" reads on its own. No game code changed.

**Run 84. Big numbers for screen readers.** An accessibility-tree sweep of every tab and of 46
windows reached from them, with everything unlocked, found no unlabelled buttons, so the run 26
work still holds for everything added since. It did show that TalkBack reads short-form numbers
letter by letter: "47.01Qa" comes out as "47.01 Q a". The Stardust counter, the per-second line and
generator prices now carry a hidden copy in words for screen readers: "47.01 quadrillion" in
English (the game's own names, up to vigintillion), and the phone's own words elsewhere up to
10^18 ("47.010 Billionen", "14,41 trilhões"), then scientific. Players who chose scientific
notation hear it as shown. The words are worked out only when the visible text changes, and the
Build tab frame time is unchanged.

**Run 85. Big numbers in words, everywhere.** A sweep of the accessibility tree for short-form
numbers ("44.21M/s", "+9.95M Dark Matter") found 68 more places after run 84: tap value, each
generator's rate, the Cosmos card (Dark Matter, bonus, next Dark Matter, per hour), anomaly goals,
the collapse and anomaly windows, Stats, the Stardust Vault, Missions and contracts, and the
labels of upgrade and Echo buttons. Two helpers do it: setSpoken for live lines (it only works out
the words when the shown text changes) and numHtml / pctHtml for templates, both pairing the
shown text, hidden from screen readers, with an sr-only copy in words. The sweep now finds none
outside buttons that already carry a spoken label. Screens are pixel-identical to the previous
build and frame times are unchanged.

**Run 86. Numbers in words in toasts and windows.** About 45 more places build short-form numbers
into text (rewards, mission goals, expedition yields, Market lines, the daily gift, button labels in
windows). Rather than touch each one, the toast area and the window layer now watch for new text:
any "4.95B"-style number gets a hidden copy in words beside it, and the pair sits in one span so
flex layouts see a single item. A suffix followed by a digit is left alone, because German writes
days as "2T 04h". The contract reward with "+ Medal" is built as one pair so it wraps as before.
German store screenshots differ from the build before run 85 only in animation and random missions.

**Run 87. Soak test after runs 84 to 86.** Runs 85 and 86 added a watcher on the toast and window
layers, so this run looked for leaks: Stats (which redraws every second) and Missions were each left
open for 30 seconds and 300 numbered toasts were fired in a row. DOM nodes went back to 6,449 from
6,315 at the start, every toast was removed, the JS heap stayed near 3 MB and there were no
errors. Random-tap sessions in all five languages and 30 damaged saves in the browser were clean.
The check is saved as tools/soak.mjs. No game code changed.

**Run 88. A month of play.** The simulator played 30 days of 10-minute sessions every two hours.
With its old rule (collapse only when Dark Matter would double) universes stretched from hours to
9 days apart by week 3, a wall. That rule is not how the game teaches collapsing, so the simulator
gained PEAK=1: collapse once this universe's Dark Matter per hour has passed its peak, as the
Cosmos card has shown since run 81. Played that way, universes last under a day in week 1, one to
two and a half days in weeks 2 and 3 and four and a half days at day 25, with 30 collapses, 11
Stellar Echoes and twice the Stardust of the old rule. Two gentler Echo settings (cost x1.5 per
level instead of x2; x1.6 production instead of x1.25) only pushed the old rule's wall back by
about two days, so balance is unchanged. A new layer past Stellar Echoes is the post-launch item
for players in their second month (added to the backlog).

**Run 89. "A good time to collapse."** Run 88 showed that collapsing once Dark Matter per hour
has passed its peak keeps universes short all month, while waiting to double Dark Matter hits a
wall by week 3. The game now tells players when that moment comes. Each universe remembers its best
Dark Matter per hour (sampled every second, saved, reset on collapse). Once the current rate falls
under 95% of that best and the collapse is worth at least a quarter of the Dark Matter already
owned, the Cosmos card shows a gold "Past its best rate: a good time to collapse." line, the
Collapse button gets a gold ring and the Cosmos tab gets its dot. This is the same rule as the
simulator's PEAK=1. It is not shown before the first collapse, which has its own hint, or during an
anomaly, which has its own goal. Translated into all four languages. Adding the field shifted the
save fuzz test's random paths and exposed a bug in the test itself: shared junk objects could be
nested inside themselves. Each junk value is now cloned.

**Run 90. The simulator uses the game's own nudge.** PEAK=1 in tools/simulate.mjs now calls
sampleRunPeak and pastPeak from prestige.ts (sampled once a second during play, as the game does)
instead of its own copy of the rule, so the month-long check tests the shipped code. The month
came out identical to run 88: 30 collapses, universes under a day in week 1, one to two and a
half days in weeks 2 and 3, four and a half days at day 25.

**Run 91. Red dots for screen readers.** The red dots on the tab bar (an upgrade to buy, a new
trophy, and since run 89 "a good time to collapse") and the dot on the Hyperdrive button (a free
Lucky Orbit spin) were drawn only, so TalkBack users never heard them. Each tab dot now carries a
hidden "(something new)" that is read with the tab's name only while the dot shows ("Cosmos
(something new)"), and the Hyperdrive button's label becomes "Hyperdrive, Spin free" while its
dot shows. Translated into all four languages.

**Run 92. Release check after runs 84 to 91.** The regression set again, with everything since
run 83 in: 77 unit tests, five random-tap sessions of 400 taps (one per language, two from a late
game) with no errors and saves that reload, 60 damaged saves in the browser with no errors, no
contrast failures, and the soak test back to 6,474 DOM nodes with no toasts left and a 3.2 MB heap.
Frame times on a 6x slowed CPU match a build of run 83 measured side by side on the same machine,
so the screen reader work added no cost. The collapse nudge shows in English, Spanish, French and
German with the Cosmos dot lit. No game code changed.

**Run 93. Big bonuses as whole numbers.** The collapse card showed late-game bonuses as
"+1.93K%", a short form meant for Stardust that reads oddly on a percentage. Percentages from
1,000% up to a million now show as whole numbers in the phone's own format ("+1,930%" in English,
"+1 930%" in French, "+1.930%" in German and Portuguese), and only past a million fall back to the
short form. Screen readers hear them as plain numbers too.

**Run 94. Store listing catches up.** The Play description was last written before runs 55 to
93, so it never mentioned Stellar Echoes, the Cosmos tab's "good time to collapse" hint, the
accessibility work or the five languages. Each of the five listings (English, Spanish, Portuguese,
French, German) now has two more lines under Collapse the Universe and two under Plays your way,
using the game's own names for each feature and setting. The counts in the listing were checked
against the game data (14 generators, 152 upgrades, 153 achievements, 6 anomalies) and still hold.
Every description stays well under Play's 4,000-character limit (the longest, French, is about
2,300). The copies in the project's store folder were refreshed to match.

**Run 95. Store screenshots refreshed.** The phone screenshots were last taken in run 83, before
the collapse nudge (run 89) and whole-number bonuses (run 93). Retaking them in all five languages
showed the new "good time to collapse" line pushing the Collapse button half under the tab bar on the
Cosmos shot, so `tools/store-shots.mjs` now scrolls the button into view first. The Cosmos shot now
shows the nudge and "+1,930%" in every language, and all 40 phone shots in the store folder were
replaced. No page errors in any language.

**Run 96. Tablet screenshots refreshed.** Following run 95, the 40 landscape tablet shots were
retaken in all five languages. The side panel has room for the whole collapse card, so the nudge
and the Collapse button show without scrolling. No page errors, and the store folder now has
phone and tablet shots that match the current build.

**Run 97. Stability check after runs 93 to 96.** Run 93 changed how percentages are written, so
five random-tap sessions of 400 taps were run: late game in German, French and Portuguese (the
locales whose number grouping differs from English), and a fresh game in Spanish and English. All
five had no page errors, every number stayed finite, and each save reloaded. The browser save fuzz
(60 damaged saves) and the 77 unit tests also pass.

**Run 98. Buy amount remembered.** The Build tab's x1 / x10 / x100 / Next / Max choice reset to x1
every time the game opened, so a player who always buys with Max had to pick it again each session.
It is now a setting saved with the game, checked on load like the other settings (an unknown value
falls back to x1, and older saves start on x1), and restored when a save code is loaded. A unit test
covers the load checks; in Playwright, choosing Max and reloading kept Max selected with no page
errors, and the browser save fuzz still passes.

**Run 99. Performance re-check after runs 84 to 98.** Same late-game save, CPU slowed 6x, compared
with a build from before run 93 on the same machine: the Build tab median is 50 ms a frame and
Upgrades 16.7 ms for both, so nothing since has slowed the game. Watching the page for changes did
turn up one waste: the Cosmos tab rewrote the hidden flag on its "Dark Matter per hour" line on every
frame even when nothing changed (8 page changes in 2 s with the tab just sitting there). It now uses
the same only-if-changed helper as every other line, and the Cosmos tab makes no page changes while
idle. Unit tests pass.

**Run 100. Windows keep focus.** Following run 99, every tab and window was watched for page
changes while sitting idle. Nine windows (Stats, Boosts, Crystals, Garden, Event, Forge, Market,
Star Pass and Missions) rebuilt all their buttons every second to keep countdowns fresh, even when
nothing had changed. That threw keyboard and screen reader focus back to the page: a player who
moved to the Market's Max button with TalkBack or a keyboard lost their place a second later. A
new `setHtml` helper now rebuilds a window only when its markup actually changed, and when it does
(a countdown ticking), it puts focus back on the same control. In Playwright, a focused button in
each of six windows kept focus after 2.5 s (before: focus fell to the page every time), the idle
scan shows no window or tab changing the page while nothing happens, and two random-tap sessions
were clean. The Lucky Orbit spin, which disables buttons by hand, always rebuilds when it ends.

**Run 101. Countdowns tick in place.** Run 100 kept keyboard focus, but a window whose countdown
changed each second (Market, Crystals, Stats, the Star Pass card) still rebuilt every node once a
second, which moves TalkBack's reading position. Countdowns and clocks in windows are now written
with `tickHtml`, and when only those changed, `setHtml` updates their text and leaves every other
node alone. The crystal progress bar is rounded to a tenth of a percent so it no longer changes the
markup every second. The idle scan now shows only Missions rebuilding, and only while a "Harvest
Stardust" mission is counting up real progress. In Playwright, the focused button in Market,
Crystals, Forge, Garden and Boosts stays the very same element after 2.5 s; a late-game French
random-tap session was clean and unit tests pass.

**Run 102. Accessibility re-check, and live mission progress.** The accessibility-tree sweep (50
views) and the contrast check were re-run after runs 98 to 101 and found nothing. Following run 101,
the Missions window was the last one rebuilding while a "Harvest Stardust" mission counted up: its
progress line is now a ticking line (still read as words, such as "5 billion / 1 quadrillion") and
its bar moves in whole percents, so the window keeps its nodes while the number climbs. The idle
scan now shows no window rebuilding; a fresh-game Portuguese random-tap session was clean and unit
tests pass.

**Run 103. Soak re-check, and Stats ticks in place.** The soak test (Stats and Missions left open
30 s each, then 300 toasts) was re-run after the window changes in runs 100 to 102: DOM nodes came
back to 6,473 from 6,328 at the start, the heap stayed near 3 MB and there were no errors, the same
as run 87. Stats was the last window rebuilding every second, because the bank, the totals and
production climb all the time; those four lines now tick in place too. That showed a gap from run
101: a ticking value written as plain text lost its words-for-screen-readers copy, because the
number watcher walked from the new text node itself, which a tree walker skips. It now walks from
the parent, so in Playwright German Stats reads "300.000 Billionen" and English production reads
"370.8 million per second" after the values have ticked. Unit tests and a late-game Spanish
random-tap session are clean.

**Run 104. Number words past 10^18 in every language.** Since run 84, screen readers in German,
French, Spanish and Portuguese heard numbers from 10^18 up in scientific form ("9 E 18"), and
10^15 to 10^18 as "300.000 Billionen", because Intl's compact words stop at 10^12. Every number
from 10^15 to 10^63 (the game's whole range) now has its own word: the long scale for German,
French and Spanish ("9 Trillionen", "3,2 trilliards", "4 mil trillones") and the short scale for
Brazilian Portuguese ("9 quintilhões"), singular for exactly one ("1 Trillion"). Unit tests cover
each language; in Playwright, German Stats reads "300 Billiarden" and "9 Trillionen", and a
late-game German random-tap session was clean.

**Run 105. Scientific numbers read aloud.** With the scientific number setting on (and for any
number past the last suffix, 10^66), screen readers heard "3.00e17" as "3 point 0 0 e 17", and
numbers inside finished text such as toasts were not caught at all. Scientific numbers are now read
as "3 times ten to the 17" ("3 mal zehn hoch 17", "fois dix puissance", "por diez elevado a", "vezes
dez elevado a"), both in templates and in text the number watcher finds. Unit tests cover English,
German and Portuguese; in Playwright, Stats with scientific numbers reads that way in English and
German, and a late-game random-tap session was clean.

**Run 106. Collapse hint when you come back.** If the universe went past its best rate while the
player was away, the welcome-back window now adds "Past its best rate: a good time to collapse."
(`AwayReport.collapseHint`, from `pastPeak`). It reuses the line already translated for the Cosmos
tab, so all five languages have it. In Playwright, after a 3-hour absence the line shows with a
peaked run and stays away without one; a random-tap session was clean.

**Run 107. Release check after runs 98 to 106.** Runs 100 to 103 changed how every window redraws,
so the regression set ran again: 77 unit tests, five random-tap sessions of 400 taps (one per
language) and two late-game ones in French and German, all with no errors and saves that reload;
60 damaged saves in the browser with no errors; no contrast failures; the accessibility-tree sweep
(50 scans) with every control named and no page errors; and the soak test back to 6,473 DOM nodes
with no toasts left and a 3.2 MB heap. No game code changed.

**Run 108. Tutorial bubble stays readable while tapping.** On a small phone (320 x 568, German) the
first-minutes hints sit over the asteroid, right where the player taps. Their fill was 14% opaque,
so the "+1" numbers and sparks drawn on the canvas below showed through and covered words of "Buy a
Mining Drone below". The bubble is now nearly opaque with the same cyan tint and border; the
contrast check still passes. Side by side before and after in Playwright, mid-tap. Noted, not
changed: the first two achievement toasts cover the bubble for a few seconds at that size.

**Run 109. Pop-ups stay off the tutorial on small phones.** Following run 108, on a 320 x 568 phone
the first two achievement pop-ups covered "Buy a Mining Drone below" for four seconds, right when a
new player needs it. When a hint shows and the sky area is under 290 px tall, `main.ts` sets
`.hinting` on it, and pop-ups then show one at a time with only their title (the full text stays in
the Trophies tab). In Playwright the hint is fully readable at 320 x 568; at 360 x 740 (sky 303 px)
nothing changes. A random-tap session was clean.

**Run 110. Short-sky pop-up rule covers common phones.** Measured across sizes (German, mid-game):
the sky area is 233 px at 320 x 568, 262 at 360 x 640, 283 at 360 x 690, 303 at 360 x 740 and 375 at
412 x 915. Run 109's 260 px cut-off missed 360 x 640, one of the most common low-end Android sizes,
where the four-line upgrade hint was again covered by two pop-ups. The cut-off is now 290 px, so
360 x 640 and 360 x 690 get one-line pop-ups too; at 360 x 740 the two full pop-ups already clear
the hint. Also checked this run: cold start is 0.36 s, or 1.36 s on a 6x slowed CPU (1.2 s in
run 55), and the pacing simulator's first six hours are unchanged (first collapse at 3h 54m).

**Run 111. Two generators fit on short phones.** On a 360 x 640 screen the Build tab showed one
generator and part of a second above the tab bar (0 full ones at 320 x 568). Portrait screens up to
700 px tall now get a smaller sky (36% instead of 41%, at least 200 px) and tighter generator rows
(60 px minimum, 44 px icons) and upgrade chips (48 px, still a full touch target). Two full
generators now fit at 360 x 640 and one at 320 x 568; taller phones are unchanged. The short sky
also turns on run 109's one-line pop-ups. Store screenshots are taken at 360 x 640, so the English
phone set was retaken (more of the Build list shows); the other four languages follow next run.

**Run 112. Phone store screenshots retaken in four languages.** Following run 111's tighter Build tab
at 360 x 640 (the store-shot size), the eight phone shots were retaken in Spanish, Portuguese,
French and German, matching the English set. All 32 rendered with no page errors and were checked
side by side; captions and button labels fit in every language. Tablet shots are unchanged (they
are landscape, which the new rules do not touch).

**Run 113. One-line rate on 320 px phones.** Every tab was screenshotted late-game in German at
320 x 568 and 360 x 640, with a check for clipped text. Nothing was clipped, but at 320 px the
production rate under the Stardust total wrapped to two lines ("440,1T pro / Sekunde"), making the
header 94 px tall instead of 77. Below 360 px the rate now drops its 30 px indent, and it never
wraps (an ellipsis if it ever has to). In all five languages at 320 and 360 px the header is 77 px
and no rate is cut.

**Run 114. Split-screen on phones.** The portrait lock does not stop Android from running the game
in half a phone screen. In a 412 x 300 or 360 x 330 window the 220 px sky minimum pushed the tab bar
and the Build list off the bottom, so the game could not be played. Windows under 520 px tall and
under 560 px wide now get a slimmer top bar (62 px), a sky of 30% (at least 96 px), a shorter tab
bar and a smaller hint. Measured in Playwright: the Build list is 92 px at 412 x 300 (was 26 px,
under the tab bar), 182 px at 412 x 420 and 252 px at 412 x 520, with the tab bar on screen in all.
Unfolded and landscape large screens were already fine (shop beside the sky).

**Run 115. Large text on short phones, and sky buttons in split-screen.** At Android's 130% text
size (the most the game follows), every tab at 320 x 568 and 360 x 640 and the Build tab in a
412 x 420 split-screen window read without clipping; long lines end in an ellipsis. The split-screen
check found the sky's corner buttons overlapping: in a sky 96 to 156 px tall, the event timer sat on
the Missions button and the gift on Hyperdrive. Under 520 px tall they now share one row along the
top (event, Missions, then Hyperdrive and a slightly smaller gift on the right). A bounding-box check
finds no overlaps at 412 x 520, 420 and 300, 360 x 330, 320 x 568 and 360 x 640.

**Run 116. Windows in split-screen.** Every main window (Settings, Stats, Shop, Goals, the daily
gift, the event and Hyperdrive) was opened at 412 x 300 and 360 x 330. All had their close button
on screen and a scrolling middle, but at 412 x 300 the middle was only 139 px, under a card and a
half, because of the 36 px gap above the window and roomy title and button rows. Under 520 px tall
(and under 560 px wide) a window now uses the full height with tighter rows: the middle is 197 px at
412 x 300 and 417 px at 412 x 520. No page errors in either size.

**Run 117. Release check after runs 108 to 116, and weekday store shots.** Runs 108 to 116 were
layout changes for small and split-screen windows, so: 77 unit tests; random-tap sessions of 400
taps at 412 x 300, 320 x 568 (German, late game) and 412 x 420 (French, late game) with no errors
and saves that reload; the soak test back to 6,473 DOM nodes and a 3.2 MB heap; the
accessibility-tree sweep (54 scans) clean; no contrast failures. The English tablet shots, retaken,
match the stored ones apart from animation, so landscape tablets are untouched. That retake ran on a
Friday and caught a real problem with the tool: the weekend event put its banner and doubled boost
times into the Boosts shot. `tools/store-shots.mjs` now shifts the page's `Date` to a Wednesday (only
the date, so animations still run), which makes the shots the same on any day.

**Run 118. Midnight with the game open.** The weekend event opens tonight (Friday) for the first
real players to see it, so the day changes were checked live, with the page's clock shifted to 20
seconds before local midnight (New York time zone) and the game left running. Thursday to Friday:
the event button appears with "2d 23h" and the daily gift button lights without a reload. Sunday
to Monday: the event button goes away on the dot, and an open event window switches to "This
weekend's event has ended. The next one opens on Friday." instead of counting below zero. A daily
gift taken just before midnight is offered again just after. No page errors; no code changed.

**Run 119. Weekend event window in every language.** With the first live weekend starting, the event
window was opened on a Saturday clock at 320 x 568 in all five languages, top and bottom. Every
title, badge line, the Event Pass card, the four Flux generators and the footer fit with nothing cut
or overflowing (checked by script and by eye), and there were no page errors. The ad button's
"+10 min of Flux" still pays at least 600 Flux for a player with no Flux production yet
(`eventAdBoost` uses a rate of at least 1 per second), enough for the first Flux Skimmer. No code
changed.

**Run 120. Broken save copies no longer pile up.** When the main save cannot be read, the game loads
the backup and keeps the unreadable text under its own key for support. Each failure added a new
key and none were removed, so a phone whose save kept breaking would slowly fill browser storage,
and once it was full every save would fail. Only the newest three copies are now kept. In
Playwright, six corrupted starts in a row leave three copies (six before), each time loading the
backup's 12,345 Stardust with no page errors; a random-tap session was clean.

**Run 121. Phone copy used when local saves are unreadable.** On Android the game skipped the phone (Preferences) copy whenever any local save key existed, even if every local save was damaged. It then started fresh and overwrote the good phone copy on the next save. `loadState` now reports whether it found a readable save, and the phone copy is checked whenever it did not. Checked on a fake Android phone: old code lost the save (0 Stardust in both places), new code restored 777,777.

**Run 122. Unreadable save kept when both copies are damaged.** The game already set aside an unreadable main save (newest three kept) when it loaded the backup. When the backup was unreadable too, it started fresh and overwrote the damaged main save, losing the only thing support could try to recover. It now sets that save aside in both cases. Checked in Playwright: old code kept nothing, new code kept the damaged save; the run 120 cap of three and the run 121 phone copy still work.

**Run 123. Warning when the browser cannot save.** If storage was full or blocked, a save failed silently and the player lost everything on reload. On Android the phone copy still saves, so nothing changes there. In a browser the game now shows one red toast per session: "This browser is not saving your progress. To keep it, use Copy save code in Settings." It is translated into all four other languages. Checked in Playwright with storage forced full: one toast after two failed saves, no errors.

**Run 124. Settings says when the browser is not saving.** The run 123 toast disappears after nine seconds. Settings still said "Progress saves automatically on this device" even while saves were failing. While browser saves fail, that line is now replaced by a red note: "This browser is not saving your progress right now. Copy your save code before you close the game." It sits right above the Copy save code button, is translated into all five languages, and clears after the next successful save. Also checked with storage fully blocked (as with cookies off): the game loads, plays and shows both warnings with no errors.

**Run 125. Save codes survive chat and email.** A save code pasted back from a message app often comes with quotes, line breaks, invisible characters or the URL-safe alphabet. Before, any of these made Load save code fail with "That save code did not work". The loader now keeps only the code's own characters. A new unit test covers smart quotes, CRLF wrapping every 60 characters, zero-width spaces, missing padding and URL-safe codes. In Playwright, a quoted, wrapped code failed before the fix and loads now. Also measured late-game frame times with the CPU slowed 6x against the build from 30 commits ago: they are the same, so there is no regression (this container is slower than earlier ones).

**Run 126. Battery saver check runs again after each evolution.** Later forms draw a heavier sky. With the CPU slowed 6x, the Build tab's median frame goes from 67 ms as an Asteroid to 100 ms at a late form, with the same buildings. The automatic battery saver check only ran once, in the first 20 seconds of a new game when the sky is lightest, so a phone that coped early could stutter later. The 20-second check now runs again after each evolution, unless saver is already on or the player set it themselves (new `saverManual` setting). Checked in Playwright with the CPU slowed 6x: after an evolution, saver turned on for an auto player and stayed off for a player who had set it by hand.

**Run 127. Release regression pass after the save changes.** Runs 121 to 126 touched the save, load and frame loop, so the release checks ran again. All 40 damaged late-game saves loaded and clicked through every tab and window with no errors (seed 127). The memory soak ended at 6,473 nodes and a 3.2 MB heap with no errors, the same as run 110. Also timed the sky's drawing for each of the seven forms: 4 to 8 ms per frame at full speed, with the Gas Giant and Star forms heaviest. Baking the backdrop colour into the nebula image was tried and dropped, because the gain was smaller than run-to-run noise.

**Run 128. Rewarded buttons say when no ad is available.** On a phone, a rewarded button did nothing when AdMob had no ad (no fill, or no network). If loading hung, the tap waited forever. All ten rewarded placements go through `showRewarded`, which now waits up to 6 seconds for an ad that is not loaded yet. If none arrives, it shows "No ad is ready right now. Please try again in a minute.", translated into all five languages. An ad that fails while showing still returns quietly, because some plugin versions report closing an ad early the same way. Checked with a fake Android AdMob plugin: an ad loads and rewards; with no fill, the message appears at once; when loading hangs, the message appears after 6 s (the old code was still waiting when the test gave up at 30 s).

**Run 129. The ad wait also covers starting the ad SDK.** Run 128 capped the wait for an ad to load, but `showRewarded` first waited, with no limit, for AdMob to start, and starting includes the consent check. With no network that can stall, leaving the button dead again. The 6-second wait now covers starting and loading together. Checked with the fake Android plugin: ad loads (rewarded), no fill (message at once), loading hangs (message at 6 s), starting hangs (message at 6 s). The browser stand-in ad still opens and rewards.

**Run 130. Banner space matches the real banner.** The banner is off by default (`AD_CONFIG.banner`), but if cj turns it on, the game reserved a fixed 60 px at the bottom as soon as it asked for a banner. With no fill that left an empty strip, and adaptive banners on taller phones are up to 90 px or more, so the banner covered part of the tab bar. Space is now made only once AdMob shows a banner, at the height its `bannerAdSizeChanged` event reports, and removed on `bannerAdFailedToLoad` or an error. Checked with a fake Android plugin: a 90 px banner gets 90 px (old: 60), no fill or an error leaves no gap (old: 60 px empty strip), and turning it off removes the space.

**Run 131. Purchases never leave a button stuck.** On a phone, `buyProduct` waited for Google Play's approval with no limit. If `order()` threw, or the payment was pending (cash or bank transfer in some countries), the Shop or pass button stayed busy until the window was closed, and a thrown order was an unhandled error. A thrown order now counts as not bought. If no approval arrives 15 s after Google Play's dialog closes, the button frees up and a toast says "Your purchase is pending. It will be added as soon as the payment goes through." (translated into all five languages). The approval still grants the item whenever it arrives. Restore purchases now reports a failure instead of throwing. Checked with a fake billing plugin: success, cancel, thrown order, pending, approval at 17 s (granted after the pending message), and restore failure. The old code was still waiting on the thrown and pending cases when the test gave up at 30 s.

**Run 132. Reminders follow the phone's permission.** If a player turned reminders on and later blocked notifications for the game in Android settings, Settings still showed reminders as on, and nothing arrived. The game now checks the permission at start and on every return to the app. If it is blocked, the setting turns off, so Settings matches what the phone allows and the player can turn it back on (which asks again). Checked with a fake notifications plugin: granted keeps it on; denied turns it off and the Settings toggle shows off (the old code showed on).

**Run 133. Keyboard no longer covers the save code box on Android 15+.** Builds target API 36, so the app is drawn edge to edge. Edge to edge, Android no longer shrinks the window for the on-screen keyboard (`adjustResize` stops working), and the insets listener added in run 54 only padded for the system bars. The Load save code sheet sits at the bottom, so the keyboard would cover its text box and Load button. The listener in `tools/android.sh` now pads the bottom by whichever is taller, the navigation bar or the keyboard (`WindowInsetsCompat.Type.ime()`), so the WebView shrinks and the sheet moves up. The Android build in CI compiles the change. The web side was checked by shrinking the viewport as the keyboard would, to 440 and 340 px tall with the box focused, in English and German: the text box and Load button stay fully in view.

**Run 134. A missed full-screen ad no longer costs the next break.** Full-screen ads only come after a collapse, at most one per 8 minutes. The 8-minute clock started when the game asked for an ad, even if AdMob had none loaded, so after a no-fill the next collapse within 8 minutes also went without an ad. `showInterstitial` now reports whether an ad showed, and the clock starts only then. Players see no more ads than the rules allow. Checked by collapsing with a fake Android plugin: with an ad, it shows and the clock starts; with no fill, nothing shows and the clock stays free (old code started it anyway); the browser stand-in still shows and starts the clock. Also ran two 500-step late-game monkey sessions with no errors.

**Run 135. Red warnings outlast routine toasts.** Only two toasts show at once, and a new one pushed out the oldest. So the run 123 "browser is not saving" warning (and other red ones, such as the store being down) could vanish in a second under a burst of achievement or comet toasts. Routine toasts are now pushed out first, and a red one goes only when nothing else can. Checked in Playwright: a save warning followed by three routine toasts stays on screen (old code dropped it at the second one); with two warnings showing, a new toast pushes out the older warning.

**Run 136. A message instead of an endless splash when the game cannot start.** If the game script fails to load or crashes before the first frame (for example an old or broken WebView that the version check misses), the player used to stare at the splash screen forever. A small inline script in index.html now waits 15 seconds; if the game never came up and no crash or old-WebView screen is showing, it hides the splash and shows 'Stardust Empire could not start. Please close the game and open it again.' in the player's language. Checked in Playwright: a normal start shows nothing, a build with a broken main.js shows the message.

**Run 137. The start message no longer appears on a slow load.** Run 136's 15-second timer replaced the splash with 'could not start' even when the game was only loading slowly; the game then came up over it, but a player may already have closed it. Now the message shows within a second when a game script fails to load or has an error before the game is up, and otherwise only after 30 seconds. Checked in Playwright: normal and 18-second loads show no message; a broken main.js, a missing main.js and a missing module show it after about one second; a script that never arrives shows it at 30 seconds.

**Run 138. Start-up problems are announced by screen readers.** The three screens a player sees when the game cannot run (old WebView, could not start, and the crash report) were plain text, so TalkBack said nothing until the player went looking. Each now has `role="alert"`, and the crash report box (and the one in Settings) is labelled "Error report" in every language instead of reading out the raw report. Checked with Playwright's accessibility snapshot for each screen, with a missing main.js, a simulated old WebView and a forced error in `start()`.

### Backlog from research (best first)
1. After launch: a layer past Stellar Echoes for players in their second month, when universes
   start lasting four days or more (run 88).
