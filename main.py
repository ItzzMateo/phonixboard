from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)
DB_PATH = 'kanban.db'

# Hilfsfunktion: DB initialisieren
def init_db():
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal'
        )''')
        conn.commit()
        conn.close()

init_db()

@app.route("/")
def home():
    return render_template("index.html")

# API: Alle Tasks abrufen
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, description, status, priority FROM tasks")
    tasks = [dict(id=row[0], title=row[1], description=row[2], status=row[3], priority=row[4]) for row in c.fetchall()]
    conn.close()
    return jsonify(tasks)

# API: Task erstellen
@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO tasks (title, description, status, priority) VALUES (?, ?, ?, ?)",
              (data['title'], data.get('description', ''), data.get('status', 'To Do'), data.get('priority', 'normal')))
    conn.commit()
    task_id = c.lastrowid
    conn.close()
    return jsonify({'id': task_id}), 201

# API: Task bearbeiten
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE tasks SET title=?, description=?, status=?, priority=? WHERE id=?",
              (data['title'], data.get('description', ''), data.get('status', 'To Do'), data.get('priority', 'normal'), task_id))
    conn.commit()
    conn.close()
    return '', 204

# API: Task löschen
@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    conn.commit()
    conn.close()
    return '', 204

if __name__ == "__main__":
    app.run(debug=True)
