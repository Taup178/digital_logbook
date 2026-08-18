import { Archives } from '../functions/archives.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Archives', () => {
  let archives;

  beforeEach(() => {
    archives = new Archives();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── archive_project ─────────────────────────────────────────
  it('should archive a project successfully', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await archives.archive_project('a@b.com', 'My Project');

    expect(result).toEqual({ success: true, message: 'Project archived successfully' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE projects SET archived = true WHERE user_email = $1 AND project_name = $2',
      ['a@b.com', 'My Project']
    );
  });

  it('should return failure when archiving a project fails', async () => {
    pool.query.mockRejectedValue(new Error('update failed'));

    const result = await archives.archive_project('a@b.com', 'My Project');

    expect(result).toEqual({ success: false, message: 'update failed' });
  });

  // ─── unarchive_project ───────────────────────────────────────
  it('should unarchive a project successfully', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await archives.unarchive_project('a@b.com', 'My Project');

    expect(result).toEqual({ success: true, message: 'Project unarchived successfully' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE projects SET archived = false WHERE user_email = $1 AND project_name = $2',
      ['a@b.com', 'My Project']
    );
  });

  it('should return failure when unarchiving a project fails', async () => {
    pool.query.mockRejectedValue(new Error('update failed'));

    const result = await archives.unarchive_project('a@b.com', 'My Project');

    expect(result).toEqual({ success: false, message: 'update failed' });
  });

  // ─── archive_entry ───────────────────────────────────────────
  it('should archive an entry successfully', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await archives.archive_entry('a@b.com', 'My Project', 1);

    expect(result).toEqual({ success: true, message: 'Entry archived successfully' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE entries SET archived = true WHERE id = $1 AND user_email = $2 AND project_name = $3',
      [1, 'a@b.com', 'My Project']
    );
  });

  it('should return failure when archiving an entry fails', async () => {
    pool.query.mockRejectedValue(new Error('update failed'));

    const result = await archives.archive_entry('a@b.com', 'My Project', 1);

    expect(result).toEqual({ success: false, message: 'update failed' });
  });

  // ─── unarchive_entry ─────────────────────────────────────────
  it('should unarchive an entry successfully', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await archives.unarchive_entry('a@b.com', 'My Project', 1);

    expect(result).toEqual({ success: true, message: 'Entry unarchived successfully' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE entries SET archived = false WHERE id = $1 AND user_email = $2 AND project_name = $3',
      [1, 'a@b.com', 'My Project']
    );
  });

  it('should return failure when unarchiving an entry fails', async () => {
    pool.query.mockRejectedValue(new Error('update failed'));

    const result = await archives.unarchive_entry('a@b.com', 'My Project', 1);

    expect(result).toEqual({ success: false, message: 'update failed' });
  });

  // ─── getArchives ─────────────────────────────────────────────
  it('should get archived entries with project name filter', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, archived: true }] });

    const result = await archives.getArchives('a@b.com', 'P1');

    expect(result).toEqual({ success: true, data: [{ id: 1, archived: true }] });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM entries WHERE user_email = $1 AND archived = true AND project_name = $2',
      ['a@b.com', 'P1']
    );
  });

  it('should get all archived entries without project name', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, archived: true }] });

    const result = await archives.getArchives('a@b.com', null);

    expect(result).toEqual({ success: true, data: [{ id: 1, archived: true }] });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM entries WHERE user_email = $1 AND archived = true',
      ['a@b.com']
    );
  });

  // ─── getUnarchived ───────────────────────────────────────────
  it('should get unarchived entries with project name filter', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, archived: false }] });

    const result = await archives.getUnarchived('a@b.com', 'P1');

    expect(result).toEqual({ success: true, data: [{ id: 1, archived: false }] });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL) AND project_name = $2',
      ['a@b.com', 'P1']
    );
  });

  it('should get all unarchived entries without project name', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, archived: false }] });

    const result = await archives.getUnarchived('a@b.com', null);

    expect(result).toEqual({ success: true, data: [{ id: 1, archived: false }] });
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL)',
      ['a@b.com']
    );
  });

  it('should handle unexpected thrown errors', async () => {
    pool.query.mockRejectedValue(new Error('Connection lost'));

    const result = await archives.archive_project('a@b.com', 'My Project');

    expect(result).toEqual({ success: false, message: 'Connection lost' });
  });
});
