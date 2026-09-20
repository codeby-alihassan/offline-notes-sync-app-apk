import { useState } from 'react';
import { Header } from './components/Header';
import { NotesList } from './components/NotesList';
import { NoteEditor } from './components/NoteEditor';
import { BottomNav, MobileTab } from './components/BottomNav';
import { MobileCloudView, MobileAccountView } from './components/MobileViews';
import { useAuth } from './hooks/useAuth';
import { useSync } from './hooks/useSync';
import { useNotes } from './hooks/useNotes';

export default function App() {
  const {
    user,
    isAuthenticated,
    isConfigured,
    signInWithGoogle,
    signOut,
    refreshConfig,
    authError,
  } = useAuth();

  const {
    status,
    pendingCount,
    lastSyncedAt,
    isOnline,
    triggerSync,
  } = useSync();

  const {
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
  } = useNotes(user?.id || null);

  // Mobile navigation state
  // mobileView: 'list' (browsing cards or tabs) vs 'editor' (full screen note writer)
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [mobileTab, setMobileTab] = useState<MobileTab>('notes');

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setMobileView('editor');
  };

  const handleCreateNote = async () => {
    const newNote = await createNote('', '');
    if (newNote) {
      setActiveNoteId(newNote.id);
      setMobileView('editor');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setMobileTab('notes');
  };

  return (
    <div className="flex flex-col h-screen w-screen max-w-full overflow-x-hidden overflow-y-hidden bg-neutral-100 font-sans text-neutral-900 select-none">
      {/* Top Navigation Header (Always present, compact on mobile) */}
      <Header
        status={status}
        pendingCount={pendingCount}
        lastSyncedAt={lastSyncedAt}
        isOnline={isOnline}
        user={user}
        isAuthenticated={isAuthenticated}
        isConfigured={isConfigured}
        onSync={triggerSync}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        onConfigChanged={refreshConfig}
      />

      {/* Auth error banner */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 text-center font-medium">
          {authError}
        </div>
      )}

      {/* Main App Canvas */}
      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto md:border-x md:border-neutral-200/80 bg-white relative">
        {/* ======================================================== */}
        {/* MOBILE VIEW IMPLEMENTATION (< md)                        */}
        {/* ======================================================== */}

        {/* 1. Mobile Note Editor (takes 100% of mobile screen when editing) */}
        <div
          className={`${
            mobileView === 'editor' ? 'flex' : 'hidden'
          } md:hidden flex-1 h-full w-full flex-col overflow-hidden bg-white z-20`}
        >
          <NoteEditor
            note={activeNote}
            onUpdateNote={updateNote}
            onDeleteNote={(id) => {
              deleteNote(id);
              handleBackToList();
            }}
            onBackToList={handleBackToList}
            onCreateNewNote={handleCreateNote}
          />
        </div>

        {/* 2. Mobile List / Tabs (when not in full-screen editor) */}
        <div
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:hidden flex-1 h-full w-full flex-col overflow-hidden bg-neutral-50/50`}
        >
          {mobileTab === 'notes' && (
            <NotesList
              notes={filteredNotes}
              activeNoteId={activeNoteId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              isLoading={isLoading}
            />
          )}

          {mobileTab === 'cloud' && (
            <MobileCloudView
              status={status}
              pendingCount={pendingCount}
              lastSyncedAt={lastSyncedAt}
              isOnline={isOnline}
              isConfigured={isConfigured}
              onSync={triggerSync}
              onConfigSaved={refreshConfig}
              onClose={() => setMobileTab('notes')}
            />
          )}

          {mobileTab === 'account' && (
            <MobileAccountView
              user={user}
              isAuthenticated={isAuthenticated}
              onSignIn={signInWithGoogle}
              onSignOut={signOut}
              onClose={() => setMobileTab('notes')}
            />
          )}

          {/* Mobile Bottom Navigation (fixed at bottom with thumb-friendly targets) */}
          <BottomNav
            activeTab={mobileTab}
            onSelectTab={(tab) => setMobileTab(tab)}
            onNewNote={handleCreateNote}
            syncStatus={status}
            pendingCount={pendingCount}
            notesCount={notes.length}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* ======================================================== */}
        {/* DESKTOP & TABLET VIEW IMPLEMENTATION (>= md)              */}
        {/* ======================================================== */}
        <div className="hidden md:flex flex-1 h-full w-full overflow-hidden">
          {/* Notes Sidebar List */}
          <div className="flex flex-col h-full w-80 lg:w-96 flex-shrink-0 border-r border-neutral-200/80">
            <NotesList
              notes={filteredNotes}
              activeNoteId={activeNoteId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              isLoading={isLoading}
            />
          </div>

          {/* Note Editor Pane */}
          <div className="flex-1 h-full flex flex-col overflow-hidden bg-white">
            <NoteEditor
              note={activeNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onCreateNewNote={handleCreateNote}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
