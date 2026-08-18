import { Entries } from '../functions/entries.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Entries', () => {
  let entries;

  beforeEach(() => {
    entries = new Entries();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── addEntry ────────────────────────────────────────────────
  describe('addEntry', () => {
    it('should add a new entry successfully', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, entries: 'new-entry' }] });

      const result = await entries.addEntry('a@b.com', 'P1', 'new-entry', '2026-08-20T00:00:00Z');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Entry added successfully');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO entries'),
        expect.arrayContaining(['a@b.com', 'P1', 'new-entry'])
      );
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('insert failed'));

      const result = await entries.addEntry('a@b.com', 'P1', 'entry', null);

      expect(result).toEqual({ success: false, message: 'insert failed' });
    });
  });

  // ─── updateEntry ─────────────────────────────────────────────
  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, entries: 'new-entry' }] });

      const result = await entries.updateEntry('a@b.com', 'P1', 1, 'new-entry');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Entry updated successfully');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE entries SET'),
        expect.any(Array)
      );
    });

    it('should return failure when no entry matches', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await entries.updateEntry('a@b.com', 'P1', 999, 'new-entry');

      expect(result).toEqual({ success: false, message: 'Entry not found. Check that the entry exists and belongs to this user/project.' });
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('update failed'));

      const result = await entries.updateEntry('a@b.com', 'P1', 1, 'new-entry');

      expect(result).toEqual({ success: false, message: 'update failed' });
    });

    it('should return no changes when nothing to update', async () => {
      const result = await entries.updateEntry('a@b.com', 'P1', 1, null, undefined, undefined, undefined);

      expect(result).toEqual({ success: true, message: 'No changes to update' });
    });
  });

  // ─── getEntries ──────────────────────────────────────────────
  describe('getEntries', () => {
    it('should retrieve entries for a user and project', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, entries: 'entry-1' }] });

      const result = await entries.getEntries('a@b.com', 'P1');

      expect(result).toEqual({
        success: true,
        message: 'Entries retrieved successfully',
        data: [{ id: 1, entries: 'entry-1' }],
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM entries'),
        ['a@b.com', 'P1']
      );
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('select failed'));

      const result = await entries.getEntries('a@b.com', 'P1');

      expect(result).toEqual({ success: false, message: 'select failed' });
    });
  });

  // ─── getAllEntries ───────────────────────────────────────────
  describe('getAllEntries', () => {
    it('should retrieve all entries for a user across projects', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, entries: 'entry-1' }, { id: 2, entries: 'entry-2' }] });

      const result = await entries.getAllEntries('a@b.com');

      expect(result).toEqual({
        success: true,
        message: 'All entries retrieved successfully',
        data: [{ id: 1, entries: 'entry-1' }, { id: 2, entries: 'entry-2' }],
      });
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('select failed'));

      const result = await entries.getAllEntries('a@b.com');

      expect(result).toEqual({ success: false, message: 'select failed' });
    });
  });

  // ─── deleteEntry ─────────────────────────────────────────────
  describe('deleteEntry', () => {
    it('should delete an existing entry', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, entries: 'entry-to-delete' }] });

      const result = await entries.deleteEntry('a@b.com', 'P1', 'entry-to-delete');

      expect(result).toEqual({ success: true, message: 'Entry deleted successfully' });
    });

    it('should return failure when no entry matches', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await entries.deleteEntry('a@b.com', 'P1', 'missing-entry');

      expect(result).toEqual({ success: false, message: 'Entry not found. Something went wrong' });
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('delete failed'));

      const result = await entries.deleteEntry('a@b.com', 'P1', 'entry');

      expect(result).toEqual({ success: false, message: 'delete failed' });
    });
  });

  // ─── sortUnarchivedEntries ──────────────────────────────────
  describe('sortUnarchivedEntries', () => {
    it('should sort by due date ascending (sort_type 0)', async () => {
      pool.query.mockResolvedValue({ rows: [{ due_date: '2026-08-10' }, { due_date: '2026-08-01' }] });

      const result = await entries.sortUnarchivedEntries('a@b.com', 'P1', 0);

      expect(result).toEqual({
        success: true,
        message: 'Unarchived entries sorted successfully',
        data: [{ due_date: '2026-08-10' }, { due_date: '2026-08-01' }],
      });
    });

    it('should sort by priority (sort_type 1)', async () => {
      const rows = [
        { priority: 'Not urgent, not important', id: 1 },
        { priority: 'Urgent and important', id: 2 },
        { priority: 'Urgent but not important', id: 3 },
      ];
      pool.query.mockResolvedValue({ rows });

      const result = await entries.sortUnarchivedEntries('a@b.com', 'P1', 1);

      expect(result.data).toEqual([
        { priority: 'Urgent and important', id: 2 },
        { priority: 'Urgent but not important', id: 3 },
        { priority: 'Not urgent, not important', id: 1 },
      ]);
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('order failed'));

      const result = await entries.sortUnarchivedEntries('a@b.com', 'P1', 0);

      expect(result).toEqual({ success: false, message: 'order failed' });
    });
  });

  // ─── sortArchivedEntries ─────────────────────────────────────
  describe('sortArchivedEntries', () => {
    it('should sort archived entries by due date ascending (sort_type 0)', async () => {
      pool.query.mockResolvedValue({ rows: [{ due_date: '2026-08-10' }] });

      const result = await entries.sortArchivedEntries('a@b.com', 'P1', 0);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Archived entries sorted successfully');
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('order failed'));

      const result = await entries.sortArchivedEntries('a@b.com', 'P1', 0);

      expect(result).toEqual({ success: false, message: 'order failed' });
    });
  });
});
