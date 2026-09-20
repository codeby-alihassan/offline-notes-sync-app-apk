import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Trash2, Clock, Check, ArrowLeft, FileEdit } from 'lucide-react';

interface NoteEditorProps {
  note: Note | undefined;
  onUpdateNote: (id: string, updates: { title?: string; content?: string }) => void;
  onDeleteNote: (id: string) => void;
  onBackToList?: () => void;
  onCreateNewNote?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onBackToList,
  onCreateNewNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Sync internal state when note selection changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsConfirmingDelete(false);
    } else {
      setTitle('');
      setContent('');
    }
  }, [note?.id]);

  if (!note) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-neutral-50/50 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-center text-neutral-400 mb-4">
          <FileEdit className="w-6 h-6 text-neutral-500" />
        </div>
        <h2 className="text-base font-semibold text-neutral-800">No Note Selected</h2>
        <p className="text-xs text-neutral-500 max-w-xs mt-1 leading-relaxed">
          Select an existing note from the list, or create a brand new note to begin writing.
        </p>
        {onCreateNewNote && (
          <button
            onClick={onCreateNewNote}
            className="mt-5 px-5 min-h-[44px] text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-2xs transition-all active:scale-95"
          >
            Create New Note
          </button>
        )}
      </div>
    );
  }

  // Handle title edit
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onUpdateNote(note.id, { title: newTitle });
  };

  // Handle content edit
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onUpdateNote(note.id, { content: newContent });
  };

  // Format timestamp
  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const isPending = note.sync_status === 'pending';

  return (
    <div className="flex-1 h-full flex flex-col bg-white w-full overflow-hidden">
      {/* Editor Header / Top Toolbar - min 44px touch targets */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-neutral-200/80 flex items-center justify-between gap-2 bg-white sticky top-0 z-20">
        {/* Left: Back button & timestamp */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onBackToList && (
            <button
              id="editor-back-btn"
              onClick={onBackToList}
              className="md:hidden min-h-[44px] min-w-[44px] -ml-1 rounded-xl text-neutral-800 hover:bg-neutral-100 active:bg-neutral-200 flex items-center justify-center transition-colors"
              title="Back to notes list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-neutral-500 min-w-0">
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                isPending ? 'bg-amber-50 text-amber-800 border border-amber-200/70' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
              }`}
            >
              {isPending ? (
                <>
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>Sync pending</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Synced</span>
                </>
              )}
            </span>
            <span className="text-neutral-300 hidden sm:inline">•</span>
            <span className="hidden sm:inline font-medium text-neutral-600 truncate">
              {formatTimestamp(note.updated_at)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl p-1">
              <span className="text-xs text-rose-700 font-medium px-1">Delete?</span>
              <button
                id="confirm-delete-btn"
                onClick={() => onDeleteNote(note.id)}
                className="px-2.5 min-h-[36px] text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors active:scale-95"
              >
                Yes
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2 min-h-[36px] text-xs font-medium text-neutral-600 hover:bg-neutral-200/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="delete-note-btn"
              onClick={() => setIsConfirmingDelete(true)}
              className="min-h-[44px] min-w-[44px] rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors flex items-center justify-center"
              title="Delete note"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Note Inputs - Full Width, No Horizontal Scrolling */}
      <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto w-full max-w-full space-y-3 pb-24 md:pb-6">
        {/* Title Input */}
        <input
          id="note-title-input"
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          className="w-full text-xl sm:text-2xl font-bold text-neutral-900 placeholder:text-neutral-300 focus:outline-none bg-transparent tracking-tight border-none p-0"
        />

        {/* Content Textarea */}
        <textarea
          id="note-content-textarea"
          value={content}
          onChange={handleContentChange}
          placeholder="Write note here... (Instant offline save to IndexedDB, automatic cloud sync)"
          className="w-full flex-1 min-h-[350px] resize-none text-base text-neutral-800 placeholder:text-neutral-300 focus:outline-none bg-transparent leading-relaxed border-none p-0 font-sans"
        />
      </div>

      {/* Editor Footer Status */}
      <div className="px-4 sm:px-6 py-2 border-t border-neutral-100 bg-neutral-50/50 text-[11px] text-neutral-400 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
          <span>Saved locally</span>
        </div>
      </div>
    </div>
  );
};
