from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import json

app = Flask(__name__)
DB_PATH = 'kanban.db'

# Hilfsfunktion: DB initialisieren und migrieren
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Überprüfen, ob die Tabelle 'tasks' existiert
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
    table_exists = c.fetchone()

    if not table_exists:
        # 2. Tabelle existiert nicht, also komplett neu erstellen
        c.execute('''CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            tags TEXT,
            due_date TEXT,
            subtasks TEXT,
            display_order INTEGER
        )''')
        # Seed some data for demonstration
        c.execute("""INSERT INTO tasks (title, description, status, priority, tags, due_date, subtasks, display_order) VALUES 
            ('Finish report', 'Complete the Q2 financial report', 'In Progress', 'high', 'finance,report', NULL, '[]', 0),
            ('Design new logo', 'Create concepts for the new company logo', 'To Do', 'normal', 'design,branding', NULL, '[]', 0),
            ('Fix login bug', 'Users are unable to log in on Safari', 'To Do', 'high', 'bug,auth', NULL, '[]', 1),
            ('Deploy to production', 'Push the latest version to the live server', 'Done', 'low', 'devops', NULL, '[]', 0)
        """)
    else:
        # 3. Tabelle existiert, auf Spalten prüfen (einfache Migration)
        c.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in c.fetchall()]
        
        if 'tags' not in columns:
            c.execute("ALTER TABLE tasks ADD COLUMN tags TEXT")
        if 'due_date' not in columns:
            c.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT")
        if 'subtasks' not in columns:
            c.execute("ALTER TABLE tasks ADD COLUMN subtasks TEXT")
            c.execute("UPDATE tasks SET subtasks = '[]' WHERE subtasks IS NULL")
        if 'display_order' not in columns:
            c.execute("ALTER TABLE tasks ADD COLUMN display_order INTEGER")
            c.execute("UPDATE tasks SET display_order = id")

    conn.commit()
    conn.close()

init_db()

def task_to_dict(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route("/")
def home():
    return render_template("index.html")

# API: Alle Tasks abrufen
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = task_to_dict
    c = conn.cursor()
    c.execute("SELECT * FROM tasks ORDER BY display_order ASC")
    tasks = c.fetchall()
    conn.close()
    return jsonify(tasks)

# API: Task erstellen
@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Get max display_order for the status and add 1
    c.execute("SELECT MAX(display_order) FROM tasks WHERE status = ?", (data.get('status', 'To Do'),))
    max_order = c.fetchone()[0]
    display_order = (max_order or 0) + 1

    c.execute("INSERT INTO tasks (title, description, status, priority, tags, due_date, subtasks, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              (data['title'], data.get('description', ''), data.get('status', 'To Do'), data.get('priority', 'normal'), data.get('tags', ''), data.get('due_date'), json.dumps(data.get('subtasks', [])), display_order))
    conn.commit()
    task_id = c.lastrowid
    conn.close()
    # Fetch and return the created task
    return get_task(task_id)

# API: Task abrufen (neu)
@app.route("/api/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = task_to_dict
    c = conn.cursor()
    c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    task = c.fetchone()
    conn.close()
    return jsonify(task)

# API: Task bearbeiten
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.json
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = task_to_dict
    c = conn.cursor()

    # Zuerst den aktuellen Task abrufen, um ihn zu aktualisieren
    c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    task = c.fetchone()
    if not task:
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    # Felder nur aktualisieren, wenn sie in der Anfrage vorhanden sind
    task['title'] = data.get('title', task['title'])
    task['description'] = data.get('description', task['description'])
    task['status'] = data.get('status', task['status'])
    task['priority'] = data.get('priority', task['priority'])
    task['tags'] = data.get('tags', task['tags'])
    task['due_date'] = data.get('due_date', task['due_date'])
    
    # Spezielle Behandlung für subtasks, die als Liste kommen
    if 'subtasks' in data:
        task['subtasks'] = json.dumps(data.get('subtasks', []))

    c.execute("""UPDATE tasks SET 
                 title=?, description=?, status=?, priority=?, 
                 tags=?, due_date=?, subtasks=? 
                 WHERE id=?""",
              (task['title'], task['description'], task['status'], task['priority'], 
               task['tags'], task['due_date'], task['subtasks'], task_id))
    
    conn.commit()
    conn.close()
    return get_task(task_id)

# API: Task löschen
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    conn.commit()
    conn.close()
    return '', 204

# API: Task duplizieren (neu)
@app.route("/api/tasks/<int:task_id>/duplicate", methods=["POST"])
def duplicate_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = task_to_dict
    c = conn.cursor()
    # Get original task
    c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    original_task = c.fetchone()
    if not original_task:
        return jsonify({'error': 'Task not found'}), 404
    
    # Get max display_order for the status and add 1
    c.execute("SELECT MAX(display_order) FROM tasks WHERE status = ?", (original_task['status'],))
    max_order = c.fetchone()[0]
    display_order = (max_order or 0) + 1
    
    # Create new task
    new_title = original_task['title'] + " (Copy)"
    c.execute("INSERT INTO tasks (title, description, status, priority, tags, due_date, subtasks, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              (new_title, original_task['description'], original_task['status'], original_task['priority'], original_task['tags'], original_task['due_date'], original_task['subtasks'], display_order))
    conn.commit()
    new_task_id = c.lastrowid
    conn.close()
    return get_task(new_task_id)

# API: Tasks neu sortieren (neu)
@app.route("/api/tasks/reorder", methods=["PUT"])
def reorder_tasks():
    data = request.json # expected: { "status": "To Do", "task_ids": [3, 1, 2] }
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    status = data.get('status')
    task_ids = data.get('task_ids', [])
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for index, task_id in enumerate(task_ids):
        c.execute("UPDATE tasks SET display_order = ? WHERE id = ? AND status = ?", (index, task_id, status))
    conn.commit()
    conn.close()
    return '', 204

if __name__ == "__main__":
    app.run(debug=True, port=5001)
