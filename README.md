# Defence-Fragebogen — lokale Testversion

Diese ZIP enthält eine kleine, lokal testbare Web-App für den Defence-/Sicherheits-/Dual-Use-Fragebogen.

## Start

1. ZIP entpacken.
2. `index.html` per Doppelklick im Browser öffnen.
3. Unternehmensprofil ausfüllen und J/P/N-Einteilung beantworten.
4. Danach erscheinen nur die passenden Abschnitte.

## Logik

- **J** = Unternehmen ist bereits im Defence-, Sicherheits- oder Dual-Use-Bereich tätig.
- **P** = Unternehmen ist noch nicht tätig, plant aber einen Einstieg.
- **N** = Unternehmen ist nicht tätig und plant aktuell keinen Einstieg.

Die Umfrage zeigt immer nur **einen thematischen Abschnitt pro Seite**. Die Navigation läuft über „Zurück“ und „Weiter“. Pflichtfelder werden pro Abschnitt geprüft. Beim Absenden werden nur die Fragen übermittelt, die für den gewählten Pfad sichtbar waren.

## Struktur

```text
defence-survey/
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       └── survey-config.js
├── data/
│   └── survey-config.json
└── docs/
    └── flowchart.mmd
```

## Datenexport

Nach dem Absenden wird ein JSON-Objekt angezeigt. Dieses kann kopiert oder als `.json` heruntergeladen werden. Das Objekt enthält:

- Survey-ID und Version
- gewählten Pfad (`J`, `P` oder `N`)
- sichtbare Seiten/Abschnitte
- alle relevanten Antworten als stabile `name/value`-Daten

## Hinweise

Dies ist eine lokale Prototyp-Version. Sie speichert Daten nicht automatisch auf einem Server. Für eine echte Feldphase braucht ihr noch eine Datenspeicherung, z.B. Backend, Datenbank, API, LimeSurvey, SoSci Survey oder ein eigenes Export-Workflow.
