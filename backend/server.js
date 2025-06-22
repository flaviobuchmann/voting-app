const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3001;
const SALT_ROUNDS = 10;
const SECRET = "mein_geheimer_schluessel";

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("/app/data/db.sqlite3");

// Tabellen erstellen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option1 TEXT NOT NULL,
      option2 TEXT NOT NULL
    )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER,
    user_id INTEGER,
    option TEXT,
    UNIQUE(poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES polls(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);
});

// Middleware: Token prüfen
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Kein Token" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Ungültiger Token" });
    req.user = user;
    next();
  });
}

// ========== AUTH ==========

// Registrierung
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Benutzername und Passwort erforderlich" });

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      function (err) {
        if (err)
          return res.status(500).json({ error: "Benutzer existiert bereits" });
        res.json({ message: "Benutzer erstellt", userId: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Hashen des Passworts" });
  }
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Benutzername und Passwort erforderlich" });

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) return res.status(500).json({ error: "DB-Fehler" });
      if (!user)
        return res.status(400).json({ error: "Benutzer nicht gefunden" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Falsches Passwort" });

      const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "2h" });
      res.json({ message: "Login erfolgreich", token });
    }
  );
});

// ========== POLLS ==========

// Alle Polls abrufen
app.get("/polls", authenticateToken, (req, res) => {
  db.all("SELECT * FROM polls", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Poll erstellen
app.post("/polls", authenticateToken, (req, res) => {
  const { question, option1, option2 } = req.body;
  if (!question || !option1 || !option2) {
    return res
      .status(400)
      .json({ error: "Frage und beide Optionen erforderlich" });
  }

  db.run(
    "INSERT INTO polls (question, option1, option2) VALUES (?, ?, ?)",
    [question, option1, option2],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, question, option1, option2 });
    }
  );
});

// ========== VOTES ==========

app.post("/votes", authenticateToken, (req, res) => {
  const { poll_id, option } = req.body;
  const user_id = req.user.userId;

  if (!poll_id || !option) {
    return res.status(400).json({ error: "poll_id und option erforderlich" });
  }

  // Insert or Update (wenn bereits abgestimmt)
  db.run(
    `
    INSERT INTO votes (poll_id, user_id, option)
    VALUES (?, ?, ?)
    ON CONFLICT(poll_id, user_id)
    DO UPDATE SET option = excluded.option
    `,
    [poll_id, user_id, option],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/votes/:pollId", authenticateToken, (req, res) => {
  const pollId = req.params.pollId;
  db.all(
    `SELECT option, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY option`,
    [pollId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Server starten
app.listen(3001, () => {
  console.log(`✅ Backend läuft auf http://localhost:3001`);
});
