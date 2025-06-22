import React, { useEffect, useState } from "react";

function App() {
  const [view, setView] = useState("login"); // login | register | vote
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [polls, setPolls] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [voteResults, setVoteResults] = useState({});
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setView("vote");
      fetchPolls(token);
    }
  }, []);

  const handleRegister = async () => {
    setMessage("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setView("login");
      setMessage("Registrierung erfolgreich. Jetzt einloggen.");
      setUsername("");
      setPassword("");
    } else {
      setMessage(data.error || "Registrierung fehlgeschlagen.");
    }
  };

  const handleLogin = async () => {
    setMessage("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      setView("vote");
    } else {
      setMessage(data.error || "Login fehlgeschlagen.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setView("login");
    setUsername("");
    setPassword("");
    setMessage("Du wurdest ausgeloggt.");
  };

  const fetchPolls = async (token) => {
    const res = await fetch("/api/polls", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (res.ok) setPolls(data);
  };

  const createPoll = async () => {
    if (!newQuestion || !option1 || !option2) {
      setMessage("Bitte Frage und beide Optionen angeben");
      return;
    }
    const token = localStorage.getItem("token");
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question: newQuestion, option1, option2 }),
    });
    const data = await res.json();
    if (res.ok) {
      setPolls([...polls, data]);
      setOption1("");
      setOption2("");

      setNewQuestion("");
    } else {
      setMessage(data.error || "Fehler beim Erstellen");
    }
  };

  const fetchVotes = async (pollId) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/votes/${pollId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (res.ok) {
      setVoteResults((prev) => ({
        ...prev,
        [pollId]: data,
      }));
    }
  };

  const vote = async (pollId, option) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ poll_id: pollId, option }),
    });

    if (res.ok) {
      fetchVotes(pollId);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* NAVBAR */}
      <header className="bg-blue-600 text-white px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Voting App</h1>
        {view === "vote" && (
          <button
            className="bg-white text-blue-600 px-4 py-1 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        )}
      </header>

      <main className="flex flex-1 overflow-hidden">
        {view !== "vote" ? (
          // ----------- LOGIN / REGISTER ANSICHT -----------
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-md bg-white p-8 shadow-md rounded">
              <h2 className="text-xl font-bold mb-4 text-center">
                {view === "login" ? "Login" : "Registrieren"}
              </h2>
              <input
                type="text"
                placeholder="Benutzername"
                className="border p-2 w-full mb-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Passwort"
                className="border p-2 w-full mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white w-full p-2 rounded mb-2"
                onClick={view === "login" ? handleLogin : handleRegister}
              >
                {view === "login" ? "Login" : "Registrieren"}
              </button>
              <p className="text-center text-sm">
                {view === "login" ? (
                  <>
                    Noch kein Konto?{" "}
                    <button
                      className="text-blue-600 underline"
                      onClick={() => setView("register")}
                    >
                      Registrieren
                    </button>
                  </>
                ) : (
                  <>
                    Bereits registriert?{" "}
                    <button
                      className="text-blue-600 underline"
                      onClick={() => setView("login")}
                    >
                      Login
                    </button>
                  </>
                )}
              </p>
              {message && (
                <p
                  className={`mt-2 text-center ${
                    message.includes("erfolgreich")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        ) : (
          // ----------- VOTING-APP ANSICHT -----------
          <>
            {/* LINKS: Neue Polls */}
            <aside className="w-1/4 p-4 bg-gray-100 overflow-auto">
              <h2 className="font-semibold text-lg mb-2">
                Neue Umfrage erstellen
              </h2>
              <input
                type="text"
                placeholder="Frage eingeben"
                className="border p-2 w-full mb-2"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
              <input
                type="text"
                placeholder="Antwortoption 1"
                className="border p-2 w-full mb-2"
                value={option1}
                onChange={(e) => setOption1(e.target.value)}
              />
              <input
                type="text"
                placeholder="Antwortoption 2"
                className="border p-2 w-full mb-2"
                value={option2}
                onChange={(e) => setOption2(e.target.value)}
              />

              <button
                className="bg-blue-600 text-white w-full p-2 rounded"
                onClick={createPoll}
              >
                Erstellen
              </button>
            </aside>

            {/* MITTE: Alle Polls */}
            <section className="flex-1 p-4 overflow-auto border-x">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Alle Umfragen</h2>
              </div>
              <ul>
                {polls.map((poll) => {
                  const result = voteResults[poll.id] || [];
                  const totalVotes = result.reduce(
                    (sum, r) => sum + r.count,
                    0
                  );
                  const yes =
                    result.find((r) => r.option === poll.option1)?.count || 0;
                  const no =
                    result.find((r) => r.option === poll.option2)?.count || 0;
                  const yesPercent = totalVotes
                    ? Math.round((yes / totalVotes) * 100)
                    : 0;
                  const noPercent = totalVotes
                    ? Math.round((no / totalVotes) * 100)
                    : 0;

                  return (
                    <li key={poll.id} className="border p-3 my-2 rounded">
                      <p className="font-semibold mb-2">{poll.question}</p>

                      <div className="flex gap-2 mb-2">
                        <button
                          className="bg-green-500 text-white px-4 py-1 rounded"
                          onClick={() => vote(poll.id, poll.option1)} // ← dynamisch
                        >
                          {poll.option1}
                        </button>
                        <button
                          className="bg-red-500 text-white px-4 py-1 rounded"
                          onClick={() => vote(poll.id, poll.option2)} // ← dynamisch
                        >
                          {poll.option2}
                        </button>
                        <button
                          className="bg-gray-200 px-2 text-sm rounded"
                          onClick={() => fetchVotes(poll.id)}
                        >
                          Ergebnisse laden
                        </button>
                      </div>

                      {totalVotes > 0 && (
                        <div className="text-sm">
                          <div className="mb-1">Ergebnisse:</div>

                          <div className="mb-1 flex justify-between items-center text-sm">
                            <span>
                              {poll.option1}: {yesPercent}% ({yes} Stimmen)
                            </span>
                            <span>
                              {poll.option2}: {noPercent}% ({no} Stimmen)
                            </span>
                          </div>

                          <div className="w-full h-4 bg-gray-200 rounded overflow-hidden flex">
                            <div
                              className="bg-green-500 h-full"
                              style={{ width: `${yesPercent}%` }}
                            />
                            <div
                              className="bg-red-500 h-full"
                              style={{ width: `${noPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* RECHTS: Eigene Polls (folgt später) */}
            <aside className="w-1/4 p-4 bg-gray-50 overflow-auto">
              <h2 className="font-semibold text-lg mb-2">Meine Umfragen</h2>
              <p className="text-sm text-gray-500">In Arbeit...</p>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
export default App;
