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
• Late game: spend spare Dark Matter on Stellar Echoes, a boost that never runs out
• The Cosmos tab tells you when it is a good time to collapse

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
• Works with screen readers, large system text, Reduce motion and a battery saver
• In English, Spanish, Portuguese, French and German

Contains ads and optional in-app purchases.

Spanish (Latin America) and Portuguese (Brazil) versions of this listing are in `docs/STORE-es-pt.md`, French (France) is in `docs/STORE-fr.md`, and German is in `docs/STORE-de.md`.

## Graphics

| Asset | File |
| --- | --- |
| App icon, 512 x 512 | `www/icon-512.png` |
| Feature graphic, 1024 x 500 (each translation gets its own, with the tagline translated) | `resources/feature-graphic.png`; `store/feature-graphic-es-419.png`, `-pt-BR`, `-fr-FR`, `-de-DE` (remake with `node tools/feature-graphics.mjs <dir>`) |
| Phone screenshots, 1080 x 1920 (upload all 8, in order) | `store/01_tap.png` … `store/08_missions.png` |
| 7-inch and 10-inch tablet screenshots, 1920 x 1080 (the same 8 for both slots) | `store/tablet/01_tap.png` … `store/tablet/08_missions.png` |

Screenshot captions, in order: Tap a rock, build an empire. Catch comets for huge bonuses. Hundreds of
upgrades. From asteroid to black hole. Collapse the universe. Trade at the Warp Exchange. Spin Lucky
Orbit every day. Always a next goal.

Tablet shots show the side-by-side layout tablets get, and Play only lists an app as designed for
tablets when they are uploaded. Spanish, Portuguese, French and German versions are in
`store/tablet/es-419/`, `pt-BR/`, `fr-FR/` and `de-DE/`. Remake them with
`node tools/store-shots.mjs <dir> en|es|pt|fr|de tablet`.

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
  personalised AdMob ads, which Families policy would not allow for under-13s. Because 13-15 is in
  the audience, the game caps ad content at the Teen rating (also set this in AdMob, Blocking
  controls, Sensitive categories / max ad content rating, so both agree).
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

## Release notes for the first release

Paste into **Release notes** when creating the release (closed test and production). Play limits
each language to 500 characters; these are 439 to 500, and tests check them. Keep the language tags.

```
<en-US>
Welcome to Stardust Empire!
• Tap your asteroid and grow it into a black hole
• 14 generators, 150+ upgrades and 150+ achievements
• Catch comets for Stardust Rushes and Lucky Hauls
• Collapse the universe for Dark Matter and permanent upgrades
• Expeditions, the Warp Exchange, the Nebula Garden and weekend events
• Plays offline, in English, Spanish, Portuguese, French and German
Thanks for playing! Tell us what you think in a review.
</en-US>
<es-419>
¡Bienvenido a Stardust Empire!
• Toca tu asteroide y conviértelo en un agujero negro
• 14 generadores, más de 150 mejoras y más de 150 logros
• Atrapa cometas para ganar Ráfagas de Polvo Estelar y Botines de la suerte
• Colapsa el universo por Materia Oscura y mejoras permanentes
• Expediciones, el Intercambio Warp, el Jardín de la Nebulosa y eventos de fin de semana
• Funciona sin conexión, en español, inglés, portugués, francés y alemán
¡Gracias por jugar! Cuéntanos qué opinas en una reseña.
</es-419>
<pt-BR>
Bem-vindo ao Stardust Empire!
• Toque no seu asteroide e transforme-o em um buraco negro
• 14 geradores, mais de 150 melhorias e mais de 150 conquistas
• Pegue cometas para ganhar Rajadas de Poeira Estelar e Saques da sorte
• Colapse o universo para ganhar Matéria Escura e melhorias permanentes
• Expedições, a Bolsa de Dobra, o Jardim da Nebulosa e eventos de fim de semana
• Funciona offline, em português, inglês, espanhol, francês e alemão
Obrigado por jogar! Conte o que achou em uma avaliação.
</pt-BR>
```

## Closed test (required for new personal accounts)

New personal developer accounts must run a closed test with at least 12 testers who stay opted in
for 14 days in a row before applying for production. Create a Google Group or an email list of
testers, add it to a Closed testing track, upload the `.aab`, and send testers the opt-in link.
