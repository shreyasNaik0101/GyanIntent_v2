"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Plus, Calendar, Tag, X, Save, Trash2, Edit2, Search, Bold, Italic, List, ListOrdered, Link as LinkIcon, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  color: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics": "from-purple-500 to-pink-500",
  "Physics": "from-blue-500 to-cyan-500",
  "Biology": "from-green-500 to-emerald-500",
  "Chemistry": "from-orange-500 to-amber-500",
  "Programming": "from-violet-500 to-purple-500",
  "General": "from-gray-500 to-slate-500",
};

const SUBJECTS = Object.keys(SUBJECT_COLORS);

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState("General");

  // Handle text selection in textarea
  const handleTextSelect = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      });
    }
  };

  // Insert formatting around selected text
  const insertFormatting = (before: string, after: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteContent.substring(start, end);
    
    const newText = 
      noteContent.substring(0, start) + 
      before + 
      (selectedText || "text") + 
      after + 
      noteContent.substring(end);
    
    setNoteContent(newText);
    
    // Set cursor position after the formatting
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + (selectedText || "text").length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("gyan_notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Initialize with sample notes
      const sampleNotes: Note[] = [
        {
          id: "1",
          title: "Pythagorean Theorem Notes",
          content: "a² + b² = c²\n\nThe fundamental theorem for right triangles. The square of the hypotenuse equals the sum of squares of the other two sides.\n\nExample: 3-4-5 triangle\n• 3² + 4² = 9 + 16 = 25\n• 5² = 25\n• Verified! ✓",
          subject: "Mathematics",
          createdAt: "2026-02-15",
          updatedAt: "2026-02-15",
          color: "from-purple-500 to-pink-500",
        },
        {
          id: "2",
          title: "Newton's Laws Summary",
          content: "Three Laws of Motion:\n\n1st Law (Inertia): An object at rest stays at rest, an object in motion stays in motion unless acted upon by an external force.\n\n2nd Law: F = ma (Force = mass × acceleration)\n\n3rd Law: For every action, there is an equal and opposite reaction.",
          subject: "Physics",
          createdAt: "2026-02-14",
          updatedAt: "2026-02-14",
          color: "from-blue-500 to-cyan-500",
        },
        {
          id: "3",
          title: "DNA Structure",
          content: "DNA Double Helix:\n\n• Structure discovered by Watson & Crick\n• Base pairs: Adenine-Thymine (A-T), Guanine-Cytosine (G-C)\n• Sugar-phosphate backbone\n• Antiparallel strands\n\nReplication: Semi-conservative",
          subject: "Biology",
          createdAt: "2026-02-13",
          updatedAt: "2026-02-13",
          color: "from-green-500 to-emerald-500",
        },
      ];
      setNotes(sampleNotes);
      localStorage.setItem("gyan_notes", JSON.stringify(sampleNotes));
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("gyan_notes", JSON.stringify(notes));
    }
  }, [notes]);

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
      setNoteSubject(note.subject);
    } else {
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteSubject("General");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteSubject("General");
  };

  const saveNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;

    const now = new Date().toISOString().split("T")[0];
    const color = SUBJECT_COLORS[noteSubject] || "from-gray-500 to-slate-500";

    if (editingNote) {
      // Update existing note
      setNotes(notes.map(n => 
        n.id === editingNote.id 
          ? { ...n, title: noteTitle, content: noteContent, subject: noteSubject, updatedAt: now, color }
          : n
      ));
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        title: noteTitle,
        content: noteContent,
        subject: noteSubject,
        createdAt: now,
        updatedAt: now,
        color,
      };
      setNotes([newNote, ...notes]);
    }

    closeModal();
  };

  const deleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  // Filter notes by search and subject
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Get content preview (first 100 chars)
  const getPreview = (content: string) => {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;
  };

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    // Split by code blocks first to preserve them
    const parts = text.split(/(`[^`]+`)/g);
    
    return parts.map((part, i) => {
      // Code inline
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-sm font-mono text-purple-400">{part.slice(1, -1)}</code>;
      }
      
      // Process markdown in this part
      let result: React.ReactNode[] = [];
      let remaining = part;
      let key = 0;
      
      while (remaining.length > 0) {
        // Bold: **text** or __text__
        const boldMatch = remaining.match(/^\*\*(.+?)\*\*|__(.+?)__/);
        if (boldMatch) {
          const text = boldMatch[1] || boldMatch[2];
          result.push(<strong key={`${i}-${key++}`} style={{ fontWeight: 700, color: '#fff' }}>{text}</strong>);
          remaining = remaining.slice(boldMatch[0].length);
          continue;
        }
        
        // Italic: *text* or _text_
        const italicMatch = remaining.match(/^\*([^*]+)\*|_([^_]+)_/);
        if (italicMatch) {
          const text = italicMatch[1] || italicMatch[2];
          result.push(<em key={`${i}-${key++}`} style={{ fontStyle: 'italic' }}>{text}</em>);
          remaining = remaining.slice(italicMatch[0].length);
          continue;
        }
        
        // Link: [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const [, text, url] = linkMatch;
          result.push(
            <a 
              key={`${i}-${key++}`} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              {text}
            </a>
          );
          remaining = remaining.slice(linkMatch[0].length);
          continue;
        }
        
        // No match, take first character
        result.push(remaining[0]);
        remaining = remaining.slice(1);
      }
      
      return <span key={i}>{result}</span>;
    });
  };

  // Render content with line breaks
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <div key={i} className="min-h-[1.5rem]">
        {line.startsWith('• ') ? (
          <div className="flex gap-2">
            <span className="text-purple-400">•</span>
            <span>{renderMarkdown(line.slice(2))}</span>
          </div>
        ) : line.match(/^\d+\.\s/) ? (
          <div className="flex gap-2">
            <span className="text-purple-400 min-w-[1.5rem]">{line.match(/^(\d+\.\s)/)?.[0]}</span>
            <span>{renderMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
          </div>
        ) : line.trim() === '' ? (
          <br />
        ) : (
          renderMarkdown(line)
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Notes</h2>
          <p className="text-white/60">Your personal study notes • {notes.length} notes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition flex items-center gap-2 font-medium"
        >
          <Plus size={18} />
          New Note
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              !selectedSubject ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            All
          </button>
          {SUBJECTS.map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                selectedSubject === subject ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredNotes.map((note, i) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-xl overflow-hidden hover:border-purple-500/50 transition cursor-pointer group"
              onClick={() => openModal(note)}
            >
              <div className={`h-2 bg-gradient-to-r ${note.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold group-hover:text-purple-400 transition flex-1">{note.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(note); }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-white/60 text-sm mb-4 line-clamp-3 whitespace-pre-line">{getPreview(note.content)}</p>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} />
                    <span className={`px-2 py-0.5 rounded bg-white/5`}>{note.subject}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {note.updatedAt}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredNotes.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <PenTool size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/40 mb-4">No notes found</p>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition"
            >
              Create your first note
            </button>
          </div>
        )}
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold">
                  {editingNote ? "Edit Note" : "New Note"}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Title */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Title</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Subject</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(subject => (
                      <button
                        key={subject}
                        onClick={() => setNoteSubject(subject)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                          noteSubject === subject 
                            ? `bg-gradient-to-r ${SUBJECT_COLORS[subject]} text-white` 
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Content</label>
                  
                  {/* Formatting Toolbar */}
                  <div className="flex gap-1 mb-2 p-1 bg-white/5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = textareaRef.current;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selected = noteContent.substring(start, end);
                        const newContent = noteContent.substring(0, start) + '**' + (selected || 'bold text') + '**' + noteContent.substring(end);
                        setNoteContent(newContent);
                        setTimeout(() => {
                          textarea.focus();
                          const newPos = start + 2 + (selected || 'bold text').length;
                          textarea.setSelectionRange(newPos, newPos);
                        }, 0);
                      }}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition font-bold"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition italic"
                      title="Italic (Ctrl+I)"
                    >
                      I
                    </button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n• ', '')}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition"
                      title="Bullet List"
                    >
                      <List size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n1. ', '')}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition"
                      title="Numbered List"
                    >
                      <ListOrdered size={16} />
                    </button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('[', '](url)')}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition"
                      title="Link"
                    >
                      <LinkIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('`', '`')}
                      className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition font-mono text-xs"
                      title="Code"
                    >
                      {'<>'}
                    </button>
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onSelect={handleTextSelect}
                    placeholder="Write your note here...&#10;&#10;Tips:&#10;• Select text and click B for bold&#10;• Select text and click I for italic&#10;• Or type **bold** and *italic* manually"
                    rows={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none resize-none text-sm"
                  />
                </div>

                {/* Live Preview */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block flex items-center gap-2">
                    <Eye size={14} />
                    Live Preview
                  </label>
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl min-h-[120px] prose prose-invert prose-sm max-w-none overflow-auto">
                    {noteContent ? renderContent(noteContent) : (
                      <span className="text-white/30 italic">Start typing to see preview...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-white/10">
                {editingNote && (
                  <button
                    onClick={() => { deleteNote(editingNote.id); closeModal(); }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={!noteTitle.trim() || !noteContent.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                    {editingNote ? "Save Changes" : "Create Note"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
