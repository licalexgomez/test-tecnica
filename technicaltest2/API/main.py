import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

DB_NAME = "app.db"
JWT_SECRET = "JWT_SECRET"
JWT_ALGO = "HS256"
JWT_EXP_MIN = 60

app = Flask(__name__)
CORS(app)

def get_db():
    db = getattr(g, "_db", None)
    if db is None:
        db = g._db = sqlite3.connect(DB_NAME)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_db", None)
    if db:
        db.close()

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    username TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS token_blacklist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token TEXT NOT NULL,
                    blacklisted_at TEXT NOT NULL
                )""")
    conn.commit()
    conn.close()

init_db()

def create_token(user_id):
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(minutes=JWT_EXP_MIN), "iat": datetime.utcnow()}
    t = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    if isinstance(t, bytes):
        t = t.decode("utf-8")
    return t

def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return {"error": "Token expirado"}
    except jwt.InvalidTokenError:
        return {"error": "Token inválido"}

def blacklist_token(token):
    db = get_db()
    cur = db.cursor()
    cur.execute("INSERT INTO token_blacklist (token, blacklisted_at) VALUES (?, ?)", (token, datetime.utcnow().isoformat()))
    db.commit()

def is_blacklisted(token):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM token_blacklist WHERE token=?", (token,))
    return cur.fetchone() is not None

def token_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth:
            return jsonify({"error": "Falta header Authorization"}), 401
        parts = auth.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Formato: Bearer <token>"}), 401
        token = parts[1]
        if is_blacklisted(token):
            return jsonify({"error": "Token revocado"}), 401
        payload = decode_token(token)
        if "error" in payload:
            return jsonify({"error": payload["error"]}), 401
        uid = payload.get("user_id")
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id, name, email, username FROM users WHERE id=?", (uid,))
        u = cur.fetchone()
        if not u:
            return jsonify({"error": "Usuario no encontrado"}), 401
        g.user = {"id": u["id"], "name": u["name"], "email": u["email"], "username": u["username"]}
        return f(*args, **kwargs)
    return wrap

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No hay datos"}), 400
    required = ("name", "email", "username", "password")
    if not all(k in data and data[k] for k in required):
        return jsonify({"error": "Debes enviar nombre, email, usuario y contraseña"}), 400
    name = data["name"].strip()
    email = data["email"].strip().lower()
    username = data["username"].strip()
    pwd = data["password"]
    if len(pwd) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400
    hashed = generate_password_hash(pwd)
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("INSERT INTO users (name,email,username,password,created_at) VALUES (?,?,?,?,?)",
                    (name, email, username, hashed, datetime.utcnow().isoformat()))
        db.commit()
        return jsonify({"msg": "Usuario creado", "user_id": cur.lastrowid}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email o usuario ya existe"}), 400
    except Exception as e:
        return jsonify({"error": "Error interno", "details": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "password" not in data or not ("email" in data or "username" in data):
        return jsonify({"error": "Debes enviar email o usuario y contraseña"}), 400
    identifier = data.get("email") or data.get("username")
    pwd = data["password"]
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id,password FROM users WHERE email=? OR username=? LIMIT 1", (identifier, identifier))
    u = cur.fetchone()
    if not u or not check_password_hash(u["password"], pwd):
        return jsonify({"error": "Usuario o clave incorrectos"}), 401
    token = create_token(u["id"])
    return jsonify({"msg": "Login exitoso", "token": token})

@app.route("/logout", methods=["POST"])
@token_required
def logout():
    token = request.headers.get("Authorization").split()[1]
    blacklist_token(token)
    return jsonify({"msg": "Sesión cerrada"})

@app.route("/tasks", methods=["GET"])
@token_required
def get_tasks():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id,label,completed,created_at,updated_at FROM tasks WHERE user_id=? ORDER BY created_at DESC", (g.user["id"],))
    resultado = cur.fetchall()
    tasks = [{"id": r["id"], "label": r["label"], "completed": bool(r["completed"]),
              "created_at": r["created_at"], "updated_at": r["updated_at"]} for r in resultado]
    return jsonify(tasks)

@app.route("/tasks", methods=["POST"])
@token_required
def add_task():
    data = request.get_json()
    if not data or "label" not in data or not data["label"].strip():
        return jsonify({"error": "Campo 'label' obligatorio"}), 400
    label = data["label"].strip()
    completed = 1 if data.get("completed") else 0
    now = datetime.utcnow().isoformat()
    db = get_db()
    cur = db.cursor()
    cur.execute("INSERT INTO tasks (label,completed,user_id,created_at) VALUES (?,?,?,?)",
                (label, completed, g.user["id"], now))
    db.commit()
    return jsonify({"msg": "Tarea creada", "task_id": cur.lastrowid}), 201

@app.route("/tasks/<int:tid>", methods=["PUT"])
@token_required
def edit_task(tid):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No hay datos"}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM tasks WHERE id=? AND user_id=?", (tid, g.user["id"]))
    if not cur.fetchone():
        return jsonify({"error": "Tarea no encontrada"}), 404
    updates = []
    vals = []
    if "label" in data:
        updates.append("label=?")
        vals.append(data["label"].strip())
    if "completed" in data:
        updates.append("completed=?")
        vals.append(1 if data["completed"] else 0)
    if not updates:
        return jsonify({"error": "Nada para actualizar"}), 400
    updates.append("updated_at=?")
    vals.append(datetime.utcnow().isoformat())
    vals.append(tid)
    cur.execute(f"UPDATE tasks SET {', '.join(updates)} WHERE id=?", tuple(vals))
    db.commit()
    return jsonify({"msg": "Tarea actualizada"})

@app.route("/tasks/<int:tid>", methods=["DELETE"])
@token_required
def remove_task(tid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM tasks WHERE id=? AND user_id=?", (tid, g.user["id"]))
    if not cur.fetchone():
        return jsonify({"error": "Tarea no encontrada"}), 404
    cur.execute("DELETE FROM tasks WHERE id=?", (tid,))
    db.commit()
    return jsonify({"msg": "Tarea eliminada"})

@app.route("/tasks/<int:tid>", methods=["GET"])
@token_required
def single_task(tid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id,label,completed,created_at,updated_at FROM tasks WHERE id=? AND user_id=?", (tid, g.user["id"]))
    t = cur.fetchone()
    if not t:
        return jsonify({"error": "Tarea no encontrada"}), 404
    return jsonify(dict(t))

@app.route("/users/<int:uid>", methods=["GET"])
@token_required
def single_user(uid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id,name,email,username,created_at FROM users WHERE id=?", (uid,))
    u = cur.fetchone()
    if not u:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(dict(u))

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Ruta no encontrada"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Error interno"}), 500

if __name__ == "__main__":
    print("Arrancando app... DB:", DB_NAME)
    app.run(debug=True)
