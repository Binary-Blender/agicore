import React, { useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { ReadingEntry } from '../../shared/types';

export default function ReadingLog() {
  const {
    currentStudent,
    currentSchoolYear,
    readingLog,
    createReadingEntry,
    updateReadingEntry,
    deleteReadingEntry,
  } = useAcademyStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newPages, setNewPages] = useState('');

  // Log reading modal state
  const [logEntry, setLogEntry] = useState<ReadingEntry | null>(null);
  const [logPages, setLogPages] = useState('');
  const [logMinutes, setLogMinutes] = useState('');

  // Complete modal state
  const [completingEntry, setCompletingEntry] = useState<ReadingEntry | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Select a student first.</p>
      </div>
    );
  }

  const currentlyReading = readingLog.filter(r => r.status === 'reading');
  const completedBooks = readingLog.filter(r => r.status === 'completed');
  const totalPages = readingLog.reduce((s, r) => s + r.pagesRead, 0);
  const totalHours = (readingLog.reduce((s, r) => s + r.totalMinutes, 0) / 60).toFixed(1);

  const handleAddBook = async () => {
    if (!newTitle.trim() || !currentStudent || !currentSchoolYear) return;
    await createReadingEntry({
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      title: newTitle.trim(),
      author: newAuthor.trim(),
      genre: newGenre.trim(),
      totalPages: newPages ? Number(newPages) : undefined,
    });
    setNewTitle('');
    setNewAuthor('');
    setNewGenre('');
    setNewPages('');
    setShowAddForm(false);
  };

  const handleLogReading = async () => {
    if (!logEntry) return;
    const addPages = Number(logPages) || 0;
    const addMinutes = Number(logMinutes) || 0;
    await updateReadingEntry(logEntry.id, {
      pagesRead: logEntry.pagesRead + addPages,
      totalMinutes: logEntry.totalMinutes + addMinutes,
    });
    setLogEntry(null);
    setLogPages('');
    setLogMinutes('');
  };

  const handleMarkComplete = async () => {
    if (!completingEntry) return;
    await updateReadingEntry(completingEntry.id, {
      status: 'completed',
      finishDate: new Date().toISOString().split('T')[0],
      rating: rating || undefined,
      review: review.trim(),
      pagesRead: completingEntry.totalPages || completingEntry.pagesRead,
    });
    setCompletingEntry(null);
    setRating(0);
    setReview('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remove this book from the reading log?')) {
      await deleteReadingEntry(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-[var(--text-heading)]">Reading Log</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Add Book
        </button>
      </div>

      {/* Reading Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-heading)]">{readingLog.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Books</div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-heading)]">{completedBooks.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Completed</div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-heading)]">{totalPages.toLocaleString()}</div>
          <div className="text-xs text-[var(--text-muted)]">Pages Read</div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-heading)]">{totalHours}h</div>
          <div className="text-xs text-[var(--text-muted)]">Reading Time</div>
        </div>
      </div>

      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Currently Reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentlyReading.map(entry => (
              <div key={entry.id} className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{entry.title}</h3>
                    {entry.author && <p className="text-xs text-[var(--text-muted)]">by {entry.author}</p>}
                  </div>
                  <button onClick={() => handleDelete(entry.id)} className="text-[var(--text-muted)] hover:text-red-400 text-xs">✕</button>
                </div>

                {entry.totalPages && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                      <span>{entry.pagesRead} / {entry.totalPages} pages</span>
                      <span>{Math.round((entry.pagesRead / entry.totalPages) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${(entry.pagesRead / entry.totalPages) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-[var(--text-muted)] mb-3">
                  {entry.totalMinutes > 0 && <span>{(entry.totalMinutes / 60).toFixed(1)}h read</span>}
                  {entry.genre && <span> &middot; {entry.genre}</span>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setLogEntry(entry)}
                    className="flex-1 px-3 py-1.5 bg-[var(--bg-input)] text-[var(--text-primary)] text-xs rounded border border-[var(--border)] hover:bg-[var(--border)]"
                  >
                    Log Reading
                  </button>
                  <button
                    onClick={() => setCompletingEntry(entry)}
                    className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Books */}
      {completedBooks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-3">Completed</h2>
          <div className="space-y-2">
            {completedBooks.map(entry => (
              <div key={entry.id} className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{entry.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {entry.author && <span>by {entry.author}</span>}
                    {entry.finishDate && <span> &middot; Finished {entry.finishDate}</span>}
                    {entry.totalPages && <span> &middot; {entry.totalPages} pages</span>}
                  </div>
                  {entry.review && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 italic">"{entry.review}"</p>
                  )}
                </div>
                {entry.rating && (
                  <div className="text-sm">
                    {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
                  </div>
                )}
                <button onClick={() => handleDelete(entry.id)} className="text-[var(--text-muted)] hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {readingLog.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-[var(--text-muted)] mb-3">No books in the reading log yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Your First Book
          </button>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] w-[400px] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-4">Add Book</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Book title"
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
              <input
                type="text"
                value={newAuthor}
                onChange={e => setNewAuthor(e.target.value)}
                placeholder="Author"
                className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newGenre}
                  onChange={e => setNewGenre(e.target.value)}
                  placeholder="Genre"
                  className="flex-1 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <input
                  type="number"
                  value={newPages}
                  onChange={e => setNewPages(e.target.value)}
                  placeholder="Pages"
                  className="w-24 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
              <button onClick={handleAddBook} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">Add Book</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Reading Modal */}
      {logEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] w-[360px] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-1">Log Reading</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">{logEntry.title}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Pages read today</label>
                <input
                  type="number"
                  value={logPages}
                  onChange={e => setLogPages(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Minutes spent</label>
                <input
                  type="number"
                  value={logMinutes}
                  onChange={e => setLogMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setLogEntry(null); setLogPages(''); setLogMinutes(''); }} className="px-4 py-2 text-sm text-[var(--text-muted)]">Cancel</button>
              <button onClick={handleLogReading} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Book Modal */}
      {completingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] w-[400px] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-1">Mark Complete</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">{completingEntry.title}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-[var(--border)]'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Review (optional)</label>
                <textarea
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  placeholder="What did you think of the book?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setCompletingEntry(null); setRating(0); setReview(''); }} className="px-4 py-2 text-sm text-[var(--text-muted)]">Cancel</button>
              <button onClick={handleMarkComplete} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
