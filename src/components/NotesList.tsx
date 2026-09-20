import React from 'react';
import { Note } from '../types';
import { Plus, Search, X, FileText, Clock, Check, ChevronRight } from 'lucide-react';

interface NotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  isLoading: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  activeNoteId,
  searchQuery,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  isLoading,
}) => {
  // Format note date cleanly
  const formatNoteDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 md:bg-white md:border-r border-neutral-200/80 w-full flex-shrink-0">
      {/* Search & Actions Bar */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-200/80 bg-white sticky top-0 z-10 space-y-3">
        {/* Desktop-only New Note button (mobile has bottom bar action) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            id="desktop-new-note-btn"
            onClick={onCreateNote}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>

        {/* Search Field - Touch friendly min 44px height */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-neutral-400 pointer-events-none" />
          <input
            id="notes-search-input"
            type="text"
            placeholder="Search all notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 min-h-[44px] text-sm bg-neutral-100/80 md:bg-neutral-50 border border-neutral-200/80 rounded-xl placeholder:text-neutral-400 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 active:scale-95"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notes List Scroll Area - Mobile Cards */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 pb-24 md:pb-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            <span>Loading notes from IndexedDB...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3.5 bg-white rounded-2xl border border-neutral-200/60 shadow-2xs my-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            {searchQuery ? (
              <div>
                <p className="text-sm font-semibold text-neutral-800">No notes found</p>
                <p className="text-xs text-neutral-500 mt-1">Try a different search keyword</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-neutral-800">Your notebook is empty</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  Notes are stored safely in your browser and automatically synchronized to the cloud.
                </p>
                <button
                  onClick={onCreateNote}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 min-h-[40px] text-xs font-semibold text-white bg-neutral-900 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create first note</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          notes.map((note) => {
            const isActive = note.id === activeNoteId;
            const displayTitle = note.title.trim() || 'Untitled note';
            const displayContent = note.content.trim().replace(/(\r\n|\n|\r)/gm, ' ') || 'No content written yet';
            const isPending = note.sync_status === 'pending';

            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all cursor-pointer group active:scale-[0.99] border ${
                  isActive
                    ? 'bg-white border-neutral-900 shadow-xs md:ring-2 md:ring-neutral-900/10'
                    : 'bg-white hover:bg-neutral-50/80 border-neutral-200/80 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <h3
                    className={`text-sm sm:text-base font-semibold truncate flex-1 ${
                      note.title.trim() ? 'text-neutral-900' : 'text-neutral-400 italic'
                    }`}
                  >
                    {displayTitle}
                  </h3>

                  {/* Sync status tag for this note */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isPending
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200/60'
                    }`}
                    title={isPending ? 'Sync pending' : 'Synced with cloud'}
                  >
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span>pending</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>synced</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-neutral-500 line-clamp-2 mt-1.5 leading-relaxed">
                  {displayContent}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 font-medium pt-2 border-t border-neutral-100">
                  <span>{formatNoteDate(note.updated_at)}</span>
                  <div className="flex items-center gap-1 text-neutral-700 font-medium text-xs">
                    <span className="hidden sm:inline">Open</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count (desktop) */}
      <div className="hidden md:flex px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50 text-xs text-neutral-500 items-center justify-between">
        <span>{notes.length} note{notes.length === 1 ? '' : 's'}</span>
        <span className="text-[11px] font-mono text-neutral-400">IndexedDB local</span>
      </div>
    </div>
  );
};
