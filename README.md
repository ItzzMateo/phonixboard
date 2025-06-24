# Phonix Kanban Board

Ein modernes und funktionsreiches Kanban Board, entwickelt mit Flask und reinem JavaScript. Dieses Projekt ist eine voll funktionsfähige Single-Page-Application (SPA) für agiles Aufgabenmanagement mit einem Fokus auf eine herausragende User Experience.

## ✨ Features

### Kernfunktionalität

- **Drag & Drop:** Verschiebe Aufgaben nahtlos zwischen den Spalten "To Do", "In Progress" und "Done".
- **Umfassendes Aufgabenmanagement:** Erstelle, bearbeite, dupliziere und lösche Aufgaben über ein intuitives Modal.
- **Persistente Speicherung:** Alle Aufgaben werden in einer lokalen SQLite-Datenbank gespeichert.
- **Automatische Sortierung:** Aufgaben werden automatisch nach Priorität sortiert (Hoch > Mittel > Niedrig), um den Fokus auf das Wichtigste zu legen.

### Erweiterte Aufgaben-Details

- **Prioritäten:** Weise jeder Aufgabe eine von drei Prioritätsstufen zu (Hoch, Mittel, Niedrig), die visuell hervorgehoben werden.
- **Fälligkeitsdaten:** Setze Fälligkeitsdaten, die als Badge angezeigt und bei Überfälligkeit rot markiert werden.
- **Subtasks / Checklisten:** Füge jeder Aufgabe eine Checkliste hinzu, um den Fortschritt detailliert zu verfolgen.
- **Tags:** Organisiere Aufgaben mit durch Komma getrennten Tags.
- **Markdown-Unterstützung:** Formatiere Aufgabenbeschreibungen mit Markdown, inklusive einer Live-Vorschau im Bearbeitungsmodal.

### User Experience & Design

- **Modernes UI/UX:** Eine saubere, kartenbasierte Oberfläche mit durchdachten Animationen und Übergängen.
- **Light & Dark Mode:** Wähle zwischen einem hellen und einem dunklen Design. Die Anwendung erkennt auch dein System-Theme und passt sich automatisch an.
- **Responsives Design:** Optimiert für Desktops, Tablets und mobile Geräte.
- **Barrierefreiheit:** Das Optionsmenü der Aufgaben ist vollständig per Tastatur bedienbar (Fokus-Management, Pfeiltasten, Escape).
- **Benutzerdefinierte Validierung:** Stilvolle, unaufdringliche Fehlermeldungen in Formularen.

## 🛠️ Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Datenbank:** SQLite
- **Libraries:** Marked.js (für Markdown-Rendering)

## 🚀 Installation & Start

1.  Stelle sicher, dass Python 3 und Flask installiert sind.
    ```bash
    pip install Flask
    ```
2.  Klone das Repository.
3.  Führe die Anwendung aus:
    ```bash
    python main.py
    ```
4.  Öffne deinen Browser und gehe zu `http://127.0.0.1:5001`. Die Datenbank `kanban.db` wird beim ersten Start automatisch erstellt.

## Projektstruktur

- `main.py`: Das Flask-Backend mit der API-Logik und Datenbank-Migration.
- `static/`: Enthält `style.css` und `script.js`.
- `templates/`: Enthält die `index.html`-Hauptdatei.
- `kanban.db`: Die SQLite-Datenbankdatei (wird automatisch erstellt).
