# Google Play store listing

Everything to paste into Play Console, in the order the console asks for it. Screenshots are made with
`npm run build && node tools/store-shots.mjs store` (eight 1080 x 1920 PNGs with captions).

## Main store listing

**App name (30 max):** Stardust Empire: Idle Space

**Short description (80 max):**
Tap an asteroid, build a galactic empire, collapse the universe and do it again.

**Full description (4000 max):**

It starts with one lonely asteroid. Tap it, harvest a speck of Stardust, and buy your first Mining
Drone. Soon you are running Lunar Bases, Gas Giant Siphons, Dyson Swarms and Warp Gates, and your
asteroid grows into a moon, a planet, a star and finally a black hole.

★ BUILD YOUR EMPIRE
• 14 generators, from tiny Mining Drones to the reality-bending Universe Compiler
• Over 150 upgrades, with synergies that make generators boost each other
• Level up generators to unlock new ways to play

★ CATCH COMETS
• Tap passing comets for Stardust Rushes, Lucky Hauls and 777x Supernova Taps
• Rare black comets carry even bigger rewards

★ COLLAPSE THE UNIVERSE
• Reset for Dark Matter and spend it on a tree of permanent cosmic upgrades
• Six anomalies: twisted universes with one strange rule and a permanent reward
• Send probes on expeditions to find ancient Relics

★ SIDE GAMES
• Trade Comet Ice and Neutron Plasma at the Warp Exchange: buy low, sell high
• Grow star seeds in the Nebula Garden and cast artifacts at the Star Forge
• Spin Lucky Orbit for a free prize every day

★ ALWAYS A NEXT GOAL
• Daily missions, weekly contracts, over 150 achievements and a seasonal Star Pass
• Weekend events with double rewards
• Daily supply drops

★ PLAYS YOUR WAY
• Your empire keeps working while you are away
• Plays fully offline, no account needed
• Optional ads give boosts; you never have to watch one
• Reminders are off unless you turn them on

Contains ads and optional in-app purchases.

Spanish (Latin America) and Portuguese (Brazil) versions of this listing are in `docs/STORE-es-pt.md`.

## Graphics

| Asset | File |
| --- | --- |
| App icon, 512 x 512 | `www/icon-512.png` |
| Feature graphic, 1024 x 500 | `resources/feature-graphic.png` |
| Phone screenshots, 1080 x 1920 (upload all 8, in order) | `store/01_tap.png` … `store/08_missions.png` |

Screenshot captions, in order: Tap a rock, build an empire. Catch comets for huge bonuses. Hundreds of
upgrades. From asteroid to black hole. Collapse the universe. Trade at the Warp Exchange. Spin Lucky
Orbit every day. Always a next goal.

## Categorisation and contact

- **App or game:** Game. **Category:** Simulation (Play has no Idle category; Simulation is where most
  idle tycoon games sit). **Tags:** Idle, Clicker, Incremental, Space, Tycoon, Casual.
- **Contact email:** required and shown publicly; use an address you check.
- **Privacy policy URL:** https://github.com/BringOutTheRainn/space-app/blob/main/docs/PRIVACY.md

## App content answers

- **Ads:** Yes, the app contains ads.
- **In-app purchases:** Yes (Google Play Billing). Products: Supporter Pack $3.99, Starter Pack $1.99,
  Crystal packs $0.99 / $4.99 / $9.99, Event Pass $2.99, Stardust Vault $2.99, Star Pass $4.99,
  four planet skins $0.99 each. None of them is a random reward, so no loot box odds are needed.
- **Target audience:** 13 and over (13-15, 16-17, 18+). Not designed for children; the ads use
  personalised AdMob ads, which Families policy would not allow for under-13s.
- **Content rating (IARC questionnaire):** category Game. Violence, fear, sexuality, language,
  controlled substances: none. Gambling: no real-money gambling and no simulated gambling (the Lucky
  Orbit wheel is free and pays only in-game boosts, never bought with money or crystals). User
  interaction: no chat, no user content, no sharing of location. Digital purchases: yes. Expected
  result: Everyone / PEGI 3, with the In-App Purchases notice.
- **Data safety:**
  - Data collected: Device or other IDs (advertising ID), shared with Google AdMob for advertising and
    fraud prevention; App interactions and approximate location, collected by AdMob for advertising.
    Purchase history is handled by Google Play and not collected by the app; game progress stays on
    the phone and is not collected.
  - Data is encrypted in transit: Yes. Users can request deletion: No account exists; uninstalling
    deletes all game data (say so, and link Google's policy for ad data).
- **Permissions the app asks for:** Internet, Notifications (opt-in reminders), Vibrate, and the
  advertising ID (added by AdMob). Exact alarms are removed from the build, so there is no Alarms &
  reminders access to declare.
- **Ad consent:** Google's consent form shows in the EEA, UK and Switzerland, and Settings shows
  "Ad privacy choices" there so players can change it later (Google requires that entry point).
- **News app:** No. **COVID-19 app:** No. **Government app:** No. **Financial features:** None.
- **Health apps:** No.

## Closed test (required for new personal accounts)

New personal developer accounts must run a closed test with at least 12 testers who stay opted in
for 14 days in a row before applying for production. Create a Google Group or an email list of
testers, add it to a Closed testing track, upload the `.aab`, and send testers the opt-in link.
