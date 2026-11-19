# MarktMentor API-voorbeeldapp

[English](README.md)

Een kleine lokale web-app op de MarktMentor Public API, in het Nederlands en
Engels. Zoek producten en volg ze, bekijk de verkoophistorie als grafiek,
verken een niche met zijn producten, en lees je eigen winkel. De API-data komt
in een lokaal SQLite-bestand.

Gebouwd op de officiële shadcn/ui-template voor
[TanStack Start](https://tanstack.com/start) (`shadcn init -t start`, stijl
radix-nova, basiskleur neutral), met alleen [shadcn/ui](https://ui.shadcn.com)-componenten,
en [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). Alle versies
staan vast in `package.json` en `package-lock.json`.

## Starten in vijf minuten

Je hebt Node.js 22.12 of nieuwer nodig.

```bash
cd app
npm install
npm start               # http://127.0.0.1:4321
```

Zonder key start de app in **demo-modus**: hij roept de echte API aan met de
openbare testsleutel `mm_test_demo`. De testsleutel antwoordt met vastgelegde
productiedata van een gesloten set (de niche "drinkfles" en de 10 best
verkopende producten daarin) en een verzonnen winkel. Zoeken, filters,
sorteren, pagina's, markten en periodes werken binnen die set, en elk product
en elke niche in een lijst gaat open; een code buiten de set die je zelf typt,
geeft HTTP 404. Voor je eigen data:

```bash
cp ../.env.example .env # zet daarna je key in .env
npm start
```

| Variabele                   | Betekenis                                                                  |
| --------------------------- | -------------------------------------------------------------------------- |
| `MARKTMENTOR_API_KEY`       | Je key (`mm_live_…`). Zonder key: demo-modus.                              |
| `MARKTMENTOR_API_BASE_URL`  | Standaard `https://api.marktmentor.nl`.                                    |
| `MARKTMENTOR_RESERVE`       | Standaard 25. Research-aanvragen stoppen bij zoveel over.                  |
| `MARKTMENTOR_DB_PATH`       | Standaard `data/marktmentor.db`.                                           |
| `MARKTMENTOR_DEMO`          | `1` zet de demo-modus aan: de app negeert dan `MARKTMENTOR_API_KEY`.       |
| `MARKTMENTOR_ALLOWED_HOSTS` | Extra hostnamen voor de dev-server, bijvoorbeeld achter een reverse proxy. |

Een tweede instantie met een eigen database, bijvoorbeeld tegen een testserver:

```bash
MARKTMENTOR_API_BASE_URL=https://test.example MARKTMENTOR_API_KEY=mm_live_… \
MARKTMENTOR_DB_PATH=data/second.db npx vite dev --host 127.0.0.1 --port 4322 --strictPort
```

Variabelen uit de shell gaan voor `.env`.

De app werkt met alleen een key. Met een betaald Premium-abonnement zonder
bundel heeft de organisatie 100 gratis research-aanvragen per maand (hooguit 25
resultaten per pagina); de gebruikspagina toont hoeveel er over zijn. Verlaag
`MARKTMENTOR_RESERVE` (bijvoorbeeld naar 5) om er meer te gebruiken. Zonder
Premium tonen de research-pagina's HTTP 403 `subscription_required` met uitleg.
**Mijn winkel** werkt zonder bundel (Pro-abonnement en een gekoppelde winkel).

## Schermen

- **Overzicht**: de producten die je volgt (kerncijfers, één grafiek, regels met een trendlijn) en je winkel in het kort.
- **Producten** en **Niches**: elke zoekparameter in een filterbalk, bewaard in de URL.
- **Product- en nichepagina**: één tabblad per endpoint. Een tabblad haalt pas data op als je het opent.
- **Mijn winkel**: de drie endpoints voor je winkel, met al hun parameters.
- **API-gebruik**: verbinding, plan, limieten per minuut, het logboek van aanroepen en de lokale data.

[COVERAGE.md](COVERAGE.md) noemt elk endpoint en elke parameter en waar die in de app zit (Engels).

## Hoe het werkt

```
pagina ──(server function)──> src/api/*.ts ──> src/server/client.ts ──(SDK)──> api.marktmentor.nl
                                           └─> src/server/cache.ts, request-log.ts (SQLite)
```

Elke aanvraag gaat via de officiële TypeScript-SDK,
[`@marktmentor/api`](https://www.npmjs.com/package/@marktmentor/api): bijvoorbeeld
`mm.products.salesHistory(code, { period, interval })`. Rond die SDK-aanroep
bewaart `src/server/client.ts` het antwoord van vandaag in de cache, stopt bij
de reserve, leest de limiet-headers en logt de aanvraag. De pagina's lezen de
antwoorden met de types van de SDK (`MarktMentor.*`), met een naam in
`src/lib/types.ts`.

| Map               | Wat                                                                                                                                                                                                  | Draait in                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `src/routes/`     | Eén bestand per pagina. Een detailpagina houdt haar URL-schema, tab-loader en tabpaneel ernaast in `-product/` of `-niche/`.                                                                         | browser en server                        |
| `src/api/`        | Server functions (`createServerFn`), één bestand per onderwerp: producten, niches, winkel, reference, account, gevolgde producten, overzicht, verbruiksmeter. De enige brug tussen pagina's en API. | server (de browser krijgt de resultaten) |
| `src/server/`     | De API-client, de cache, de limieten, het aanvraaglog en de database. Leest de key.                                                                                                                  | alleen server                            |
| `src/lib/`        | Pure code die pagina's en server delen: filters, eenheden, de regel voor veranderingen, de datadag, types. Geen API-aanroepen.                                                                       | beide                                    |
| `src/components/` | Schermen en onderdelen, per onderwerp. `ui/` is shadcn/ui zoals gegenereerd.                                                                                                                         | browser                                  |
| `tests/`          | Node-testrunner: regels, vertalingen, demo-modus en live-modus tegen `../tools/mock_api.py`.                                                                                                         |                                          |

- **De key blijft op de server.** Alleen `src/server/` leest de key. Die
  bestanden importeren `@tanstack/react-start/server-only`, dus een build
  faalt als browsercode ze importeert. De pagina's roepen server functions aan
  (`createServerFn`) en krijgen alleen de resultaten. De server luistert alleen
  op 127.0.0.1.
- **Cache per dag.** Research-data is een dagelijkse snapshot (`updatedAt`).
  Die ververst één keer per dag tussen 01:00 en 06:30 Nederlandse tijd, dus de
  app bewaart elk research-antwoord in SQLite tot 07:00 de volgende ochtend
  (Amsterdam). Een herhaalde vraag kost niets. Winkeldata wordt niet gecachet.
  De gratis reference-opzoekingen blijven dezelfde dag bewaard. De SQLite-cache
  hoort bij één instantie: met meer instanties (pods) vraagt elke instantie
  opnieuw en betaalt opnieuw. Gebruik dan een gedeelde opslag zoals Redis; zie
  <https://api.marktmentor.nl/guides/caching>.
- **Wat een pagina zelf ophaalt.** Een pagina mag bij het openen één keer
  haar eigen standaardinhoud ophalen, als dat één research-aanvraag kost en de
  rest van de dag in de cache blijft: de best verkopende producten bij
  Producten, de niches met het hoogste zoekvolume bij Niches, en suggesties op
  een leeg overzicht. Een product- of nichepagina haalt op wat je opende: het
  product of de niche (1 aanvraag) en het open tabblad (1; Reviews 2: de
  totalen en de lijst). Al het andere dat per product gaat (andere tabbladen,
  trendlijnen) wacht op een klik die zegt wat het kost. Zonder
  research-toegang, of bij de reserve, laat de pagina zien waarom ze niets
  ophaalt.
- **Geen preload.** De router laadt geen pagina's vooruit als je met de muis
  over een link gaat. Elke pagina kan de API aanroepen, en elke
  research-aanvraag kost tegoed en telt mee voor de limiet van 60 per minuut
  (30 met de openbare testsleutel).
- **Verbruik.** De meter in de zijbalk toont `X-Research-Requests-Remaining`
  van het laatste antwoord. Een badge bij elk resultaat laat zien of de data
  live kwam (één aanvraag), uit de cache (gratis) of voorbeelddata is.
  Na elke handeling (filter, markt, periode of tabblad) toont de meter wat die
  kostte: `+1`, de antwoorden uit de cache en de gratis aanvragen. Klik erop
  voor de laatste aanvragen. Hij leest alleen het lokale aanvraaglog en roept
  de API nooit aan. Het log hoort bij de app-server, dus aanvragen uit andere
  tabbladen tellen ook mee.
- **Foutmeldingen.** 401, 402, 403, 404, 409 en 429 krijgen een melding met wat
  je kunt doen. Bij de reserve stopt de app voordat de bundel of de gratis aanvragen op zijn.
- **Producten volgen.** Een gevolgd product krijgt elke dag één snapshot in de
  lokale database. **Verversen** op het overzicht ververst ze allemaal, hooguit
  één aanvraag per product per dag.
- **Waarden ongewijzigd.** De database en de CSV-bestanden bevatten de waarden
  zoals de API ze stuurt. De pagina's ronden alleen af voor de weergave.

## Talen en thema

- Alle teksten staan in `src/i18n/nl.json` en `src/i18n/en.json`. Componenten
  lezen ze via `useI18n()`. Getallen, bedragen en datums gaan via `Intl`
  (`nl-NL`, `en-GB`). CSV-bestanden zijn niet afhankelijk van de taal.
- Bij het eerste bezoek volgt de app de taal van de browser. Het taalmenu in
  de kopbalk bewaart de keuze in een cookie op deze computer.
- Licht, donker en systeemthema volgen de
  [shadcn/ui-gids voor TanStack Start](https://ui.shadcn.com/docs/dark-mode/tanstack-start).

Een taal toevoegen: kopieer `en.json`, vertaal het en voeg de taal toe aan
`LOCALES` in `src/i18n/index.tsx`. `npm test` controleert dat elke taal
dezelfde sleutels en placeholders heeft.

## Je data

De [algemene voorwaarden van MarktMentor](https://www.marktmentor.nl/AlgemeneVoorwaarden.pdf) gelden voor de
data, ook in de lokale database. Gebruik de data alleen voor je eigen bedrijf.
Zet deze app niet met je key waar anderen erbij kunnen, en deel de database
niet. Alleen de demo-modus met de openbare testsleutel mag openbaar zijn (zie
[Openbare demo](#openbare-demo)). Gebruik
**Lokale data wissen** op de pagina API-gebruik, of verwijder `data/`, als je de data
niet meer nodig hebt of als je toegang tot de API stopt.

## Controles

```bash
npm test          # vertalingen, demo-modus, en live tegen ../tools/mock_api.py
npm run typecheck
npm run lint
npm run check     # Prettier
```

## Openbare demo

De demo op https://api-demo.marktmentor.nl is deze app in demo-modus. Een
productiebuild draait zo:

```bash
npm run build     # dist/: de server en de bestanden voor de browser
npm run serve     # http://0.0.0.0:8080, alleen demo-modus
```

Of als container (`Dockerfile`), met een alleen-lezen root-bestandssysteem:

```bash
docker build -t api-demo .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp --tmpfs /data:uid=1000,gid=1000 api-demo
```

`scripts/serve.mjs` draait altijd in demo-modus en stuurt alleen de openbare
testsleutel. Hij start niet als de omgeving `MARKTMENTOR_API_KEY` heeft, een
waarde met `mm_live_` erin, of `MARKTMENTOR_DEMO` anders dan `1`. Hij
beantwoordt `GET /healthz`, schrijft de SQLite-cache naar `MARKTMENTOR_DB_PATH`
(`/data` in de container) en luistert op `PORT` (standaard 8080). De
testsleutel staat 30 aanvragen per minuut per IP-adres toe, dus de demo
bewaart elk antwoord voor de dag en deelt het tussen bezoekers. Host de app
nooit met een live key.

In demo-modus heeft elke bezoeker (browser) een eigen lijst met gevolgde
producten en een eigen aanvraaglog. De data van een demobezoeker wordt
verwijderd na 7 dagen zonder gebruik. **Lokale data wissen** wist in
demo-modus alleen de data van die bezoeker.

## Opmerkingen

- `npm start` start de Vite-dev-server. Dat is genoeg voor een lokale tool met
  je eigen key. `npm run serve` is alleen voor de openbare demo (zie hierboven).
- De router zet een zoektekst die op een getal lijkt tussen aanhalingstekens in
  de URL (`?ean=%225407…%22`). Dat is zijn standaardnotatie.
