import { useState, useEffect, useMemo, useCallback } from 'react';
import { Note } from '../types';
import { notesRepository, subscribeToNoteChanges } from '../services/notesRepository';
import { syncEngine } from '../sync/syncEngine';

export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load notes from IndexedDB
  const loadNotes = useCallback(async () => {
    if (!userId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    try {
      const userNotes = await notesRepository.getNotes(userId);
      setNotes(userNotes);

      // If active note was deleted or not set, pick the first one
      setActiveNoteId((prevId) => {
        if (prevId && userNotes.some((n) => n.id === prevId)) {
          return prevId;
        }
        return userNotes.length > 0 ? userNotes[0].id : null;
      });
    } catch (err) {
      console.error('Failed to load notes from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load and reload when userId changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Subscribe to local repository changes (e.g. from writes, sync pull)
  useEffect(() => {
    const unsubscribe = subscribeToNoteChanges(() => {
      loadNotes();
    });
    return () => {
      unsubscribe();
    };
  }, [loadNotes]);

  // Active note
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId);
  }, [notes, activeNoteId]);

  // Filtered notes by search query
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((n) => {
      return (
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
      );
    });
  }, [notes, searchQuery]);

  // Create new note
  const createNote = useCallback(async (title = '', content = '') => {
    if (!userId) return null;
    const newNote = await notesRepository.createNote(userId, title, content);
    setActiveNoteId(newNote.id);
    syncEngine.scheduleSync(300);
    return newNote;
  }, [userId]);

  // Update existing note
  const updateNote = useCallback(
    async (id: string, updates: { title?: string; content?: string }) => {
      const updated = await notesRepository.updateNote(id, updates);
      syncEngine.scheduleSync(800);
      return updated;
    },
    [],
  );

  // Delete note
  const deleteNote = useCallback(
    async (id: string) => {
      await notesRepository.deleteNote(id);
      syncEngine.scheduleSync(300);

      // Adjust active note
      setNotes((prevNotes) => {
        const remaining = prevNotes.filter((n) => n.id !== id);
        if (activeNoteId === id) {
          setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
    },
    [activeNoteId],
  );

  return {
    notes,
    filteredNotes,
    activeNote,
    activeNoteId,
    searchQuery,
    isLoading,
    setSearchQuery,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    refreshNotes: loadNotes,
  };
}
