# Voorbeelden voor de MarktMentor API

[English](README.md)

Kleine, leesbare voorbeelden voor de MarktMentor Public API. **Ze werken met
alleen een API-key.** Met een actief, betaald MarktMentor Premium-abonnement
krijgt je organisatie 100 gratis research-aanvragen per maand, ook met een key.
Om te beginnen heb je geen API-bundel nodig.

**Waar begin je.** Wil je één aanroep zien werken? Neem een script in
`python/` of `node/`: niets installeren, vijf minuten. Wil je zien hoe een heel
product de API gebruikt (cache, limieten, fouten, elk endpoint)? Start de app
in `app/`; zonder key start die in demo-modus.

| Map       | Inhoud                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `python/` | Vier scripts. Python 3.9 of nieuwer, alleen de standaardbibliotheek.      |
| `node/`   | Dezelfde vier scripts. Node 20 of nieuwer, zonder dependencies.           |
| `app/`    | Een lokale web-app in het Nederlands en Engels: TanStack Start, shadcn/ui en SQLite. Zie [app/README.nl.md](app/README.nl.md). |
| `tools/`  | Een lokale nep-API met voorbeelddata, om zonder key te testen.            |

Handleidingen en referentie: <https://api.marktmentor.nl>. De scripts melden
hun uitvoer in het Engels, net als de API en de documentatie.

## Voordat je begint

1. Een beheerder van je organisatie accepteert de API-voorwaarden in het
   dashboard: **Instellingen → MarktMentor API**.
2. Een beheerder maakt op dezelfde pagina een API-key en kopieert hem. Het
   geheim zie je maar één keer. De key stopt als de maker geen beheerder van
   de organisatie meer is.
3. Weet wat je key kan lezen:
   - **Winkel-endpoints** (je eigen bol-winkel): Pro-abonnement en een
     gekoppelde winkel. Gratis, geen bundel nodig.
   - **Research-endpoints** (producten en niches): een actief, betaald
     MarktMentor Premium-abonnement of hoger. Een proefperiode telt niet.
     Zonder bundel krijgt de organisatie 100 gratis research-aanvragen per
     kalendermaand (UTC), met hooguit 10 resultaten per pagina. De
     API-referentie in de browser en alle API-keys delen die aanvragen. Een
     API-bundel geeft er meer. Zonder Premium geven research-aanvragen HTTP 403
     `subscription_required`.

## Starten in vijf minuten

```bash
export MARKTMENTOR_API_KEY='mm_live_...'   # je key; nooit in de code zetten

cd python                                  # of: cd node
python check.py                            # node check.mjs
```

`check` kost niets. Het toont je organisatie, je research-plan en het
resterende tegoed.

| Script                                | Voorbeeld                                            | Research-aanvragen        |
| ------------------------------------- | ---------------------------------------------------- | ------------------------- |
| `check`                               | `python check.py`                                    | 0                         |
| `products_to_csv` / `products-to-csv` | `python products_to_csv.py drinkfles --max-pages 2`  | 1 per pagina              |
| `ean_history` / `ean-history`         | `python ean_history.py 5407005143414`                | 1 per EAN                 |
| `store_export` / `store-export`       | `python store_export.py`                             | 0 (winkel is gratis)      |

Met `--dry-run` zie je het plan en het verbruik zonder iets te verbruiken.

## Wat de voorbeelden laten zien

- **De key blijft bij jou.** Hij komt uit `MARKTMENTOR_API_KEY` en gaat mee als
  `Authorization: Bearer <key>`. Zet hem niet in broncode, in een browser of
  in een app.
- **Paginering.** `page` en `pageSize` (maximaal 25 voor research). De scripts
  stoppen als `pagination.hasNext` false is, bij `--max-pages`, en bij de
  grens van 10.000 resultaten per zoekvraag. Gebruik filters voor meer
  producten.
- **Het tegoed.** Elk geslaagd research-antwoord heeft
  `X-Research-Requests-Remaining`. De scripts stoppen voordat het tegoed de
  reserve bereikt (`MARKTMENTOR_RESERVE`, standaard 25) en bij HTTP 402. Een
  402 of 403 proberen ze niet opnieuw. Bij de 100 gratis aanvragen laat een
  reserve van 25 er 75 over: zet `MARKTMENTOR_RESERVE=5` om er meer te
  gebruiken.
- **De snelheidslimiet.** Bij HTTP 429 wachten de scripts op `Retry-After`. Een
  503 proberen ze een paar keer opnieuw.
- **Van EAN naar historie.** Productpaden accepteren `ean:` en de EAN van 13
  cijfers in plaats van de `productCode` van bol
  (`research/products/ean:5407005143414/sales-history/`): één aanvraag per EAN.
  Hebben meer producten die EAN, dan geeft de API HTTP 409 `ambiguous_ean` met
  de `candidates` en kiest hij niet. Het script toont ze; draai het opnieuw met
  `--code <productCode>`. Een 409 telt niet.
- **Intervallen van de historie.** `interval` is `week` of `month` (standaard).
  Met `period=2Y` alleen `month`.
- **Waarden ongewijzigd.** De CSV-bestanden bevatten de waarden zoals de API ze
  stuurt. Rond pas af als je ze toont.

## Veelvoorkomende meldingen

| Je ziet                             | Oorzaak en actie                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| HTML `404 Not Found`                | Verkeerde basis-URL, of de API staat nog niet aan voor je organisatie (early access). Neem contact op. |
| `401 authentication_failed`         | Verkeerde of ingetrokken key, of de maker is geen beheerder meer. Maak een nieuwe key.             |
| `403 api_terms_required`            | Een beheerder accepteert de API-voorwaarden in het dashboard.                                      |
| `403 subscription_required`         | Research vraagt een actief, betaald Premium-abonnement. Een proefperiode telt niet. Winkel vraagt Pro. |
| `403 subscription_plan_required`    | De winkel-endpoints vragen het Pro-abonnement.                                                     |
| `409 store_not_connected`           | Koppel je bol-winkel in het dashboard.                                                             |
| `402 bundle_exhausted`              | De bundel is op voor deze factuurperiode.                                                          |
| `402 free_quota_exhausted`          | De 100 gratis aanvragen van deze maand zijn op. Kies een bundel, of wacht op de volgende maand.    |
| `409 ambiguous_ean`                 | Meer producten hebben de EAN na `ean:`. Gebruik een productcode uit `candidates`.                  |
| `400 invalid_query` bij `interval`  | Gebruik `week` of `month`; met `period=2Y` alleen `month`.                                         |

Bewaar de header `X-Request-ID` van een research-antwoord als je support
vraagt.

## Zonder key proberen

```bash
python tools/mock_api.py &                 # http://127.0.0.1:8787
export MARKTMENTOR_API_BASE_URL=http://127.0.0.1:8787
export MARKTMENTOR_API_KEY=mm_live_demo
python python/check.py
```

`MOCK_REMAINING=3` laat zien hoe een script stopt bij het tegoed,
`MOCK_RATE=5` het wachten bij HTTP 429, `MOCK_NO_BUNDLE=1` de 100 gratis
aanvragen van een key zonder bundel, en `MOCK_NO_PREMIUM=1` de HTTP 403 van een
organisatie zonder Premium. EAN `8712345678901` krijgt de HTTP 409. De nep-API gebruikt voorbeelddata uit de
API-referentie, geen live data.

## Gebruik van de data

De [API-voorwaarden](https://api.marktmentor.nl/guides/terms-nl) gelden. Kort:

- Gebruik de data voor je eigen bedrijf. Je mag hem in je eigen systemen
  bewaren zolang je hem daarvoor nodig hebt.
- Deel je key niet en geef anderen geen toegang tot de API of de data,
  bijvoorbeeld door deze voorbeelden op een openbare server te zetten.
- Verkoop of publiceer de data niet en bouw er geen concurrerend product mee.
- Gebruik geen extra keys of organisaties om een limiet te ontlopen.

Bouw je een koppeling voor andere MarktMentor-klanten (OAuth)? Neem eerst
contact op met MarktMentor. Zie [Authentication](https://api.marktmentor.nl/guides/authentication).

## Licentie

De code van deze voorbeelden valt onder de [MIT-licentie](LICENSE): je mag hem
kopiëren, aanpassen en gebruiken, ook in je eigen producten. De licentie geldt
alleen voor de code. Voor de data die je uit de API haalt blijven de
API-voorwaarden hierboven gelden. De voorbeelddata in `demo-data/` is om de
voorbeelden te proberen.
