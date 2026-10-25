# Releasing Stardust Empire on Google Play

## What the repo already does

- Every push builds a debug APK (`stardust-empire-apk` artifact) you can install on a phone for testing.
- When the repository has a signing key in its secrets, the same workflow also builds a signed
  release bundle (`stardust-empire-play-bundle`, an `.aab`) that Google Play accepts.
- The version name comes from `package.json` and the version code from the workflow run number, so each
  build uploads as a newer version.

- Every Android build runs `tools/preflight.mjs` (also `npm run preflight`), which warns while ads are
  still in test mode, the AdMob IDs are Google's test ones, the version numbers disagree, or the
  privacy policy link doesn't open. The warnings show on the run summary.

## One-time setup

1. **Create an upload key** on your computer (keep the file and passwords safe; losing them is painful):

   ```sh
   keytool -genkeypair -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Add four repository secrets** in GitHub under Settings, Secrets and variables, Actions:

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | the output of `base64 -w0 upload.keystore` |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
   | `ANDROID_KEY_ALIAS` | `upload` |
   | `ANDROID_KEY_PASSWORD` | the key password |

3. **Create the app in the Play Console** (a developer account costs a one-time $25), turn on Play App
   Signing, and upload the `.aab` from the latest run to an internal testing track.

## Store listing

Fill in the contact email in Play Console (Store presence, Store settings): the game's crash screen
and Settings tell players to send error reports to the address shown on the Play page.

The full listing (name, descriptions, graphics, category, content rating, data safety and the closed
test steps) is in `docs/STORE.md`. Make the eight 1080 x 1920 screenshots with `npm run store-shots`.

## Privacy

The game stores progress only on the device and has no accounts or analytics. Ads are served by
Google AdMob, which collects the device advertising ID, approximate location from IP, and app
interaction data to show and measure ads. In the Play Console data safety form, declare:
- Device or other IDs: collected and shared, for advertising and analytics (by AdMob)
- App activity and approximate location: collected by AdMob for advertising
- Data is encrypted in transit; users cannot request deletion through the app (link Google's policy)

Reminder notifications are opt-in, scheduled on the device only, and need the Android 13 notification
permission (the build adds it). No push server is involved.

The privacy policy is `docs/PRIVACY.md`; use its GitHub address as the Play Console privacy policy URL:
https://github.com/BringOutTheRainn/space-app/blob/main/docs/PRIVACY.md (Settings in the game links to it).
That address only works once this branch is merged into `main`, so merge before submitting the app.
It names AdMob and links https://policies.google.com/technologies/partner-sites.
The app asks for consent in the EEA and UK through Google's consent form (configure a GDPR message in
AdMob under Privacy & messaging).

Purchases go through Google Play Billing; the game stores only which products were bought, on the
phone. Mention in-app purchases in the store listing and the Data safety form (purchase history).

## Ads setup

The build ships with Google's **test** ad IDs, so it is safe to install and try. To earn money:

1. Create an AdMob account and add the app (Android, package `com.bringouttherainn.stardustempire`).
2. Create three ad units: Rewarded (Hyperdrive and doubles), Interstitial (break ads), Banner (optional).
3. In GitHub, Settings, Secrets and variables, Actions, **Variables**, add `ADMOB_APP_ID` with the app ID
   (`ca-app-pub-…~…`). CI writes it into the Android manifest.
4. Put the three unit IDs (`ca-app-pub-…/…`) in `src/data/ads.ts` and set `testing: false`.
5. Add `app-ads.txt` to the developer website listed in Play Console. AdMob checks it to confirm the ads
   in the app are really yours; without it, it warns and may hold back some ad demand. With no website,
   a free GitHub Pages site works:
   - Create a public repository named exactly `BringOutTheRainn.github.io`.
   - Add a file `app-ads.txt` at its top level containing one line, with your publisher ID from AdMob
     (Settings, Account information): `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`
   - In that repository's Settings, Pages, publish from the `main` branch. After a few minutes
     https://bringouttherainn.github.io/app-ads.txt shows the line.
   - Put `https://bringouttherainn.github.io` as the website in Play Console (Store presence, Store
     settings). AdMob finds the file within a day or two (Apps, app-ads.txt shows its status).

Placements: Hyperdrive (rewarded, x2 production for 2 h, stacks to 8 h, runs offline); x2 offline
earnings; x2 daily drop; a break ad after collapsing or entering an anomaly (at most once per 8
minutes, never in the first 20 minutes of play). The banner is off by default (`banner: false`).

## Ad mediation (more money per ad)

Mediation lets other ad networks bid against AdMob for every placement, which usually raises
earnings per ad. No code changes are needed:

1. In the AdMob console, open Mediation and create a mediation group for each ad format (Rewarded,
   Interstitial, Banner) on Android. Add networks such as AppLovin, Unity Ads, Liftoff and Meta
   Audience Network, and turn on bidding where offered. Each network needs its own (free) account.
2. In GitHub, Settings, Secrets and variables, Actions, **Variables**, add `ADMOB_MEDIATION_ADAPTERS`
   with the adapter libraries for those networks, comma separated, for example
   `com.google.ads.mediation:applovin:13.0.1.0,com.google.ads.mediation:unity:4.13.0.0`.
   Use the versions from Google's mediation docs for each network. CI adds them to the app build.
3. Add each network's lines to `app-ads.txt` and list the networks in the privacy policy.

## In-app purchases

The Shop (cart button, top right) sells these products. Create them in Play Console, Monetize,
Products, **In-app products**, with exactly these ids, then activate them:

| Product id | Type | Suggested price | What it does |
| --- | --- | --- | --- |
| `supporter_pack` | One-time | $3.99 | No break ads or banners, production x2 forever |
| `starter_pack` | One-time | $1.99 | 10 crystals, 4 h of production, +10% production; offered for the first 3 days |
| `crystals_5` | Consumable | $0.99 | 5 Quasar Crystals |
| `crystals_30` | Consumable | $4.99 | 30 Quasar Crystals |
| `crystals_80` | Consumable | $9.99 | 80 Quasar Crystals |
| `event_pass` | Consumable | $2.99 | This weekend: double Flux and a Platinum badge |
| `vault_open` | Consumable | $2.99 | Pays out the Stardust Vault (up to 12 h of production) |
| `star_pass` | Consumable | $4.99 | This season's Star Pass premium track (bought again each season) |
| `skin_lava`, `skin_ice`, `skin_neon`, `skin_gold` | One-time | $0.99 each | Planet skins |

Play Console only lets you create products after an APK or bundle with the billing permission has
been uploaded to a testing track; the build includes it through `cordova-plugin-purchase`. Add your
Google account as a licence tester (Settings, License testing) to buy without being charged.

The game grants a purchase as soon as Google Play approves it and then acknowledges it, so a crash
in between replays the purchase on next launch rather than losing it. Purchases are checked on the
phone only; if fraud becomes a problem, add server-side receipt validation (for example with
RevenueCat or a Firebase function). A "Restore purchases" button sits at the bottom of the Shop.
In a browser the Shop runs a test checkout and nothing is charged.

## Later releases

For each update after the first:

1. Raise `version` in `package.json` and `VERSION` in `src/ui/menus.ts` to the same number (a test
   checks they match).
2. Add an entry at the top of `src/data/changelog.ts` with one short line per change players will
   notice, and add each line to `src/i18n/es.ts`, `pt.ts`, `fr.ts` and `de.ts` (a test fails until all
   four are there). Players who update see these once in a "What's new" window; new players never do.
3. Write the Play "What's new" release notes from the same lines (500 characters per language).
4. Run `npm run release-check` (about 16 minutes; the first time, install the browser it drives with
   `npm install --no-save playwright` and `npx playwright install chromium`). It taps random buttons in all five languages, looks for text
   that is cut off, left in English or too faint, loads 40 damaged saves and leaves windows open, then
   prints pass or FAIL for each. Fix anything that fails before uploading.

The game's packages are pinned to exact versions in `package.json`, and `package-lock.json` fixes everything they depend on, so every build (CI runs `npm ci`) uses the same Capacitor, AdMob and billing code. To move to newer ones, change the numbers on purpose, run `npm install` to update the lockfile, then check the Android build and test ads and purchases on a phone before releasing.
