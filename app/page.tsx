"use client";

import { useState, useEffect } from "react";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;  // ISO date "2026-05-31"
  updatedAt?: string; // ISO date, only present after first edit
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }
  return dateStr; // backwards compat: old notes stored display strings
}

function toISODate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [searchDate, setSearchDate] = useState("");
  const [searchType, setSearchType] = useState<"added" | "edited">("added");

  useEffect(() => {
    const saved = localStorage.getItem("notes");
    if (saved) setNotes(JSON.parse(saved));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes, loaded]);

  function addNote() {
    if (!title.trim()) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      body: body.trim(),
      createdAt: todayISO(),
    };
    setNotes([newNote, ...notes]);
    setTitle("");
    setBody("");
  }

  function deleteNote(id: string) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    setNotes(notes.map((n) =>
      n.id === editingId
        ? { ...n, title: editTitle.trim(), body: editBody.trim(), updatedAt: todayISO() }
        : n
    ));
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const filteredNotes = searchDate
    ? notes.filter((n) => {
        if (searchType === "added") return toISODate(n.createdAt) === searchDate;
        return n.updatedAt ? toISODate(n.updatedAt) === searchDate : false;
      })
    : notes;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Notes</h1>

      {/* Add note form */}
      <form
        onSubmit={(e) => { e.preventDefault(); addNote(); }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6"
      >
        <input
          type="text"
          placeholder="Title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-lg font-semibold text-gray-900 placeholder-gray-400 outline-none mb-2"
        />
        <textarea
          placeholder="Write your note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full text-gray-600 placeholder-gray-400 outline-none resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={!title.trim()}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add note
          </button>
        </div>
      </form>

      {/* Search by date */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-4 mb-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="text-sm text-gray-700 outline-none flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value="added"
              checked={searchType === "added"}
              onChange={() => setSearchType("added")}
              className="accent-gray-900"
            />
            Added
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="searchType"
              value="edited"
              checked={searchType === "edited"}
              onChange={() => setSearchType("edited")}
              className="accent-gray-900"
            />
            Edited
          </label>
        </div>
        {searchDate && (
          <button
            type="button"
            onClick={() => setSearchDate("")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <p className="text-center text-gray-400 mt-16">
          {searchDate ? "No notes found for this date." : "No notes yet. Add one above."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredNotes.map((note) =>
            editingId === note.id ? (
              <form
                key={note.id}
                onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
                className="bg-white rounded-2xl shadow-sm border border-gray-900 p-5"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (required)"
                  autoFocus
                  className="w-full text-lg font-semibold text-gray-900 placeholder-gray-400 outline-none mb-2"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Write your note…"
                  rows={3}
                  className="w-full text-gray-600 placeholder-gray-400 outline-none resize-none"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-sm font-medium px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editTitle.trim()}
                    className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={note.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate mb-1">
                      {note.title}
                    </h2>
                    {note.body && (
                      <p className="text-gray-600 whitespace-pre-wrap">{note.body}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(note)}
                      className="text-gray-300 hover:text-gray-600 transition-colors"
                      aria-label="Edit note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Delete note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Date footer */}
                <div className="flex justify-end items-center gap-3 mt-3">
                  {note.updatedAt && (
                    <span className="text-xs text-gray-400">
                      Edited {formatDate(note.updatedAt)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    Added {formatDate(note.createdAt)}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
