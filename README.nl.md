# Voorbeelden voor de MarktMentor API

[English](README.md)

Kleine, leesbare voorbeelden voor de MarktMentor Public API, gebouwd op de
officiële SDK's: [`marktmentor`](https://pypi.org/project/marktmentor/) voor
Python en [`@marktmentor/api`](https://www.npmjs.com/package/@marktmentor/api)
voor TypeScript. **Ze werken met alleen een key.** Met een actief, betaald MarktMentor Premium-abonnement
krijgt je organisatie 100 gratis research-aanvragen per maand, ook met een key.
Om te beginnen heb je geen API-bundel nodig.

**Waar begin je.** Wil je een CSV-bestand of één aanroep die werkt? Neem een
script in `python/`: vijf minuten. Wil je zien hoe een heel
product de API gebruikt (cache, limieten, fouten, elk endpoint)? Start de app
in `app/`; zonder key start die in demo-modus met de openbare testsleutel.
Bekijk de demo op https://api-demo.marktmentor.nl.

| Map       | Inhoud                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `python/` | Vier scripts op de Python-SDK. Python 3.10 of nieuwer.                    |
| `app/`    | Een lokale web-app op de TypeScript-SDK, in het Nederlands en Engels: TanStack Start, shadcn/ui en SQLite. Zie [app/README.nl.md](app/README.nl.md). |
| `tools/`  | Een lokale nep-API met voorbeelddata, om zonder key te testen.            |

Handleidingen en referentie: <https://api.marktmentor.nl>. De scripts melden
hun uitvoer in het Engels, net als de API en de documentatie.

## Voordat je begint

1. De eigenaar of een beheerder van je organisatie accepteert de
   [algemene voorwaarden van MarktMentor](https://www.marktmentor.nl/AlgemeneVoorwaarden.pdf) in het dashboard:
   **Instellingen → MarktMentor API**.
2. Een beheerder maakt op dezelfde pagina een key en kopieert hem. Het
   geheim zie je maar één keer. De key stopt als de maker geen beheerder van
   de organisatie meer is.
3. Wat kan je key lezen? Voor de hele API heb je een actief, betaald
   MarktMentor Premium-abonnement of hoger nodig; een proefperiode telt niet.
   - **De endpoints voor je winkel** (je eigen bol-winkel): een gekoppelde
     winkel. Gratis, geen bundel nodig.
   - **De endpoints voor research** (producten en niches): zonder bundel krijgt de organisatie 100 gratis research-aanvragen per
     kalendermaand (UTC), met hooguit 25 resultaten per pagina. De
     API-referentie in de browser en alle keys delen die aanvragen. Een
     API-bundel geeft er meer. Zonder Premium geven research-aanvragen HTTP 403
     `subscription_required`.

## Starten in vijf minuten

```bash
export MARKTMENTOR_API_KEY='mm_live_...'   # je key; nooit in de code zetten

cd python
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt            # de SDK: marktmentor
python check.py
```

`check` kost niets. Het toont je organisatie, je research-plan en het
resterende tegoed.

| Script            | Voorbeeld                                           | Research-aanvragen   |
| ----------------- | --------------------------------------------------- | -------------------- |
| `check`           | `python check.py`                                   | 0                    |
| `products_to_csv` | `python products_to_csv.py drinkfles --max-pages 2` | 1 per pagina         |
| `ean_history`     | `python ean_history.py 5407005143414`               | 1 per EAN            |
| `store_export`    | `python store_export.py`                            | 0 (winkel is gratis) |

Met `--dry-run` zie je het plan en het verbruik zonder iets te verbruiken.

De SDK verstuurt de aanvragen, geeft getypeerde antwoorden en probeert HTTP 429
en 5xx opnieuw. `python/common.py` voegt toe wat een script dat aanvragen
verbruikt ook nodig heeft: de reserve, een telling van de aanvragen van de run,
en de foutcodes in gewone woorden.

## Wat de voorbeelden laten zien

- **De key blijft bij jou.** Hij komt uit `MARKTMENTOR_API_KEY` en de SDK stuurt
  hem mee als `Authorization: Bearer <key>`. Zet hem niet in broncode, in een browser of
  in een app.
- **Paginering.** `page` en `pageSize` (maximaal 25 voor research). De SDK
  volgt de pagina's; de scripts stoppen als `pagination.hasNext` false is, bij `--max-pages`, en bij de
  grens van 10.000 resultaten per zoekvraag. Gebruik filters voor meer
  producten.
- **Het tegoed.** Elk geslaagd research-antwoord heeft
  `X-Research-Requests-Remaining`. De scripts lezen dat in een hook van de
  HTTP-client van de SDK, en stoppen voordat het tegoed de
  reserve bereikt (`MARKTMENTOR_RESERVE`, standaard 25) en bij HTTP 402. Een
  402 of 403 proberen ze niet opnieuw. Bij de 100 gratis aanvragen laat een
  reserve van 25 er 75 over: zet `MARKTMENTOR_RESERVE=5` om er meer te
  gebruiken.
- **De snelheidslimiet.** Elke groep aanroepen heeft een eigen limiet per
  minuut: 60 voor research, winkel en account, 120 voor de reference-opzoekingen
  en 30 met de openbare testsleutel. Bij HTTP 429 wacht de SDK op `Retry-After`
  en probeert opnieuw. Een 5xx probeert hij ook een paar keer opnieuw. Een 409
  probeert de SDK niet opnieuw.
- **Van EAN naar historie.** Productpaden accepteren `ean:` en de EAN van 13
  cijfers in plaats van de `productCode` van bol
  (`research/products/ean:5407005143414/sales-history/`): één aanvraag per EAN.
  Hebben meer producten die EAN, dan geeft de API HTTP 409 `ambiguous_ean` met
  de `candidates` en kiest hij niet. Het script toont ze; draai het opnieuw met
  `--code <productCode>`. Een 409 telt niet.
- **Intervallen van de historie.** `interval` is `week` of `month` (standaard).
  Met `period=2Y` alleen `month`.
- **Duidelijke foutmeldingen.** Bij elke foutcode staat wat je kunt doen.
- **Waarden ongewijzigd.** De CSV-bestanden bevatten de waarden zoals de API ze
  stuurt. Rond pas af als je ze toont.

## Veelvoorkomende meldingen

| Je ziet                             | Oorzaak en actie                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| HTML `404 Not Found`                | Verkeerde basis-URL, of de API staat nog niet aan voor je organisatie (early access). Neem contact op. |
| `401 authentication_failed`         | Verkeerde of ingetrokken key, of de maker is geen beheerder meer. Maak een nieuwe key.             |
| `403 api_terms_required`            | De eigenaar of een beheerder accepteert de algemene voorwaarden in het dashboard.                  |
| `403 subscription_required`         | Voor de API heb je een actief, betaald Premium-abonnement nodig. Een proefperiode telt niet.       |
| `403 bundle_payment_failed`         | De betaling voor de verlenging van de API-bundel is mislukt. De eigenaar past de betaalmethode aan in het dashboard. |
| `409 store_not_connected`           | Koppel je bol-winkel in het dashboard.                                                             |
| `402 bundle_exhausted`              | De bundel is op voor deze factuurperiode.                                                          |
| `402 free_quota_exhausted`          | De 100 gratis aanvragen van deze maand zijn op. Kies een bundel, of wacht op de volgende maand.    |
| `409 ambiguous_ean`                 | Meer producten hebben de EAN na `ean:`. Gebruik een productcode uit `candidates`.                  |
| `400 invalid_query` bij `interval`  | Gebruik `week` of `month`; met `period=2Y` alleen `month`.                                         |
| `301` met een lege body             | Het pad eindigt niet op een slash. De SDK voegt die voor je toe.                                   |

Bewaar de header `X-Request-ID` van een research-antwoord als je support
vraagt. De scripts tonen hem bij elke foutmelding.

## Zonder key proberen

```bash
python tools/mock_api.py &                 # http://127.0.0.1:8787
export MARKTMENTOR_API_BASE_URL=http://127.0.0.1:8787
export MARKTMENTOR_API_KEY=mm_live_demo
python python/check.py                     # in de .venv van python/
```

`MOCK_REMAINING=3` laat zien hoe een script stopt bij het tegoed,
`MOCK_RATE=5` het wachten bij HTTP 429, `MOCK_NO_BUNDLE=1` de 100 gratis
aanvragen van een key zonder bundel, en `MOCK_NO_PREMIUM=1` de HTTP 403 van een
organisatie zonder Premium. EAN `8712345678901` krijgt de HTTP 409. De nep-API gebruikt voorbeelddata uit de
API-referentie, geen live data.

## Gebruik van de data

De [algemene voorwaarden van MarktMentor](https://www.marktmentor.nl/AlgemeneVoorwaarden.pdf) gelden voor de API en
de data.

- Gebruik de data voor je eigen bedrijf.
- Deel je key niet en geef anderen geen toegang tot de API of de data,
  bijvoorbeeld door deze voorbeelden met je key op een openbare server te
  zetten. Openbaar hosten mag alleen in demo-modus met de openbare testsleutel
  `mm_test_demo` (zie [app/README.nl.md](app/README.nl.md)), nooit met een
  live key.

Bouw je een koppeling voor andere MarktMentor-klanten (OAuth)? Neem eerst
contact op met MarktMentor. Zie [Authentication](https://api.marktmentor.nl/guides/authentication).

## Licentie

De code van deze voorbeelden valt onder de [MIT-licentie](LICENSE): je mag hem
kopiëren, aanpassen en gebruiken, ook in je eigen producten. De licentie geldt
alleen voor de code. Voor de data die je uit de API haalt blijven de
algemene voorwaarden hierboven gelden. De voorbeelddata in `demo-data/` (voor de
mock-API in `tools/`) is om de voorbeelden te proberen.
