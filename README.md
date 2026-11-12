# Knesset Speaker model

A model from [Event Neutral](https://eventneutral.com): when will the Knesset elected on 2026-10-27 elect a Speaker? Built around Kalshi's `KXISRSPEAKERDATE` markets.

- `index.html`: the Question page (served at knesset-speaker-model.eventneutral.com). `rules/`: the market's rules.
- `model/`: the interactive Model page. `model/model.js` holds the maths: the contract values and the daily curve.
- `model/inputs.json`: the forecast's inputs. Edit inputs here only.
- The look shared by Event Neutral pages (styles, light/dark switch, D3, sliders) is loaded from `https://eventneutral.com/kit/v1/`. Its source is in the `event-neutral-site` repository.

---

Started 2026-11-12. Nothing here is financial advice.

License: MIT, see [LICENSE](LICENSE).
