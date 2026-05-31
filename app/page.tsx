"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

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
  return dateStr;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [searchDate, setSearchDate] = useState("");
  const [searchType, setSearchType] = useState<"added" | "edited">("added");

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Could not load notes. Check your Supabase setup.");
      } else {
        setNotes((data as NoteRow[]).map(rowToNote));
      }
      setLoading(false);
    }
    fetchNotes();
  }, []);

  async function addNote() {
    if (!title.trim()) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ title: title.trim(), body: body.trim(), created_at: todayISO() })
      .select()
      .single();

    if (error) {
      setError("Could not save note.");
    } else {
      setNotes([rowToNote(data as NoteRow), ...notes]);
      setTitle("");
      setBody("");
    }
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (!error) setNotes(notes.filter((n) => n.id !== id));
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  async function saveEdit() {
    if (!editTitle.trim()) return;
    const today = todayISO();
    const { data, error: saveError } = await supabase
      .from("notes")
      .update({ title: editTitle.trim(), body: editBody.trim(), updated_at: today })
      .eq("id", editingId)
      .select()
      .single();

    if (saveError) {
      setError("Could not save changes: " + saveError.message);
      return;
    }
    setNotes(notes.map((n) => (n.id === editingId ? rowToNote(data as NoteRow) : n)));
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function addToCalendar(note: Note) {
    const iso = toISODate(note.createdAt);
    const gcStart = iso.replace(/-/g, "");
    const [y, m, d] = iso.split("-").map(Number);
    const end = new Date(y, m - 1, d + 1);
    const gcEnd = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, "0")}${String(end.getDate()).padStart(2, "0")}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: note.title,
      details: note.body,
      dates: `${gcStart}/${gcEnd}`,
    });
    window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
  }

  const filteredNotes = searchDate
    ? notes.filter((n) => {
        if (searchType === "added") return toISODate(n.createdAt) === searchDate;
        return n.updatedAt ? toISODate(n.updatedAt) === searchDate : false;
      })
    : notes;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-1" style={{ color: "#2D2D2D" }}>
          📝 My Notes
        </h1>
        <p className="text-sm font-semibold" style={{ color: "#9E9E9E" }}>
          {loading ? "Loading…" : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="rounded-2xl px-5 py-4 mb-6 font-semibold text-sm"
          style={{ background: "#FEE2E2", color: "#E8524A" }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Add note form */}
      <form
        onSubmit={(e) => { e.preventDefault(); addNote(); }}
        className="rounded-2xl p-5 mb-6"
        style={{ background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
      >
        <input
          type="text"
          placeholder="Note title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-lg font-bold outline-none mb-2 placeholder-gray-300"
          style={{ color: "#2D2D2D" }}
        />
        <textarea
          placeholder="Write your note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full outline-none resize-none placeholder-gray-300"
          style={{ color: "#2D2D2D" }}
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={!title.trim()}
            className="text-sm font-bold px-5 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "#F5C842", color: "#2D2D2D" }}
          >
            + Add note
          </button>
        </div>
      </form>

      {/* Search by date */}
      <div
        className="rounded-2xl px-5 py-4 mb-8 flex flex-wrap items-center gap-4"
        style={{ background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" style={{ color: "#F5C842" }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="text-sm outline-none flex-1 min-w-0 font-semibold"
            style={{ color: "#2D2D2D" }}
          />
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold" style={{ color: "#9E9E9E" }}>
          {(["added", "edited"] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                value={type}
                checked={searchType === type}
                onChange={() => setSearchType(type)}
                className="accent-yellow-400"
              />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>
        {searchDate && (
          <button
            type="button"
            onClick={() => setSearchDate("")}
            className="text-sm font-bold px-3 py-1 rounded-full transition-colors"
            style={{ background: "#FAF6F0", color: "#9E9E9E" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="text-center mt-16">
          <p className="text-4xl mb-3 animate-pulse">🗒️</p>
          <p className="font-semibold" style={{ color: "#9E9E9E" }}>Loading your notes…</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center mt-16">
          <p className="text-4xl mb-3">🗒️</p>
          <p className="font-semibold" style={{ color: "#9E9E9E" }}>
            {searchDate ? "No notes found for this date." : "No notes yet. Add one above!"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredNotes.map((note) =>
            editingId === note.id ? (
              <form
                key={note.id}
                onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
                className="rounded-2xl p-5"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                  border: "2px solid #F5C842",
                }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (required)"
                  autoFocus
                  className="w-full text-lg font-bold outline-none mb-2 placeholder-gray-300"
                  style={{ color: "#2D2D2D" }}
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Write your note…"
                  rows={3}
                  className="w-full outline-none resize-none placeholder-gray-300"
                  style={{ color: "#2D2D2D" }}
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                    style={{ background: "#FAF6F0", color: "#9E9E9E" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editTitle.trim()}
                    className="text-sm font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "#F5C842", color: "#2D2D2D" }}
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={note.id}
                className="rounded-2xl p-5"
                style={{ background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg truncate mb-1" style={{ color: "#2D2D2D" }}>
                      {note.title}
                    </h2>
                    {note.body && (
                      <p className="whitespace-pre-wrap leading-relaxed" style={{ color: "#9E9E9E" }}>{note.body}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => addToCalendar(note)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50"
                      style={{ color: "#9E9E9E" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#F5C842")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9E9E9E")}
                      aria-label="Add to Google Calendar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(note)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-50"
                      style={{ color: "#9E9E9E" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#2D2D2D")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9E9E9E")}
                      aria-label="Edit note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                      style={{ color: "#9E9E9E" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#E8524A")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9E9E9E")}
                      aria-label="Delete note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {note.updatedAt && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#FAF6F0", color: "#9E9E9E" }}>
                      ✏️ Edited {formatDate(note.updatedAt)}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#FAF6F0", color: "#9E9E9E" }}>
                    📅 Added {formatDate(note.createdAt)}
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
