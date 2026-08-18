import { Search } from '../functions/search.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Search', () => {
  let search;

  beforeEach(() => {
    search = new Search();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchAll', () => {
    it('should return matching entries', async () => {
      const mockData = [
        { entries: { title: 'Login Feature', status: 'done' } },
        { entries: { title: 'Signup Flow', status: 'pending' } },
        { entries: { title: 'Dashboard View', status: 'done' } },
      ];
      pool.query.mockResolvedValue({ rows: mockData });

      const result = await search.searchAll('a@b.com', 'login');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Entries retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].entries.title).toBe('Login Feature');
    });

    it('should return empty array when no entries match keyword', async () => {
      const mockData = [
        { entries: { title: 'Login Feature', status: 'done' } },
        { entries: { title: 'Signup Flow', status: 'pending' } },
      ];
      pool.query.mockResolvedValue({ rows: mockData });

      const result = await search.searchAll('a@b.com', 'dashboard');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return empty array when no entries exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await search.searchAll('a@b.com', 'test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should match keyword case-insensitively', async () => {
      pool.query.mockResolvedValue({ rows: [{ entries: { title: 'LOGIN feature', status: 'done' } }] });

      const result = await search.searchAll('a@b.com', 'LOGIN');

      expect(result.data).toHaveLength(1);
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('query failed'));

      const result = await search.searchAll('a@b.com', 'test');

      expect(result).toEqual({ success: false, message: 'query failed' });
    });
  });

  describe('searchProject', () => {
    it('should return matching entries for a specific project', async () => {
      const mockData = [
        { entries: { title: 'Login Feature', status: 'done' } },
        { entries: { title: 'Signup Flow', status: 'pending' } },
      ];
      pool.query.mockResolvedValue({ rows: mockData });

      const result = await search.searchProject('a@b.com', 'ProjectA', 'login');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Entries retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].entries.title).toBe('Login Feature');
    });

    it('should return empty array when no entries match in project', async () => {
      pool.query.mockResolvedValue({ rows: [{ entries: { title: 'Login Feature', status: 'done' } }] });

      const result = await search.searchProject('a@b.com', 'ProjectA', 'dashboard');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return empty array when project has no entries', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await search.searchProject('a@b.com', 'ProjectA', 'test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('query failed'));

      const result = await search.searchProject('a@b.com', 'ProjectA', 'test');

      expect(result).toEqual({ success: false, message: 'query failed' });
    });
  });

  describe('searchProjects', () => {
    it('should return entries from projects matching keyword', async () => {
      // First call: get projects
      // Second+ calls: get entries for each matching project
      pool.query
        .mockResolvedValueOnce({ rows: [
          { project_name: 'Alpha Project' },
          { project_name: 'Beta Project' },
          { project_name: 'Gamma App' },
        ] })
        .mockResolvedValueOnce({ rows: [
          { entries: { title: 'Alpha task 1' } },
          { entries: { title: 'Alpha task 2' } },
        ] })
        .mockResolvedValueOnce({ rows: [
          { entries: { title: 'Beta task 1' } },
        ] });

      const result = await search.searchProjects('a@b.com', 'project');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Entries retrieved successfully');
      expect(result.data).toHaveLength(3);
    });

    it('should return empty array when no projects match keyword', async () => {
      pool.query.mockResolvedValueOnce({ rows: [
        { project_name: 'Alpha Project' },
        { project_name: 'Beta Project' },
      ] });

      const result = await search.searchProjects('a@b.com', 'nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return empty array when no projects exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await search.searchProjects('a@b.com', 'test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should match project names case-insensitively', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ project_name: 'Alpha Project' }] })
        .mockResolvedValueOnce({ rows: [{ entries: { title: 'task' } }] });

      const result = await search.searchProjects('a@b.com', 'ALPHA');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return failure when projects query fails', async () => {
      pool.query.mockRejectedValue(new Error('projects query failed'));

      const result = await search.searchProjects('a@b.com', 'test');

      expect(result).toEqual({ success: false, message: 'projects query failed' });
    });

    it('should return failure when entries query fails for a matching project', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ project_name: 'Alpha Project' }] })
        .mockRejectedValueOnce(new Error('entries query failed'));

      const result = await search.searchProjects('a@b.com', 'Alpha');

      expect(result).toEqual({ success: false, message: 'entries query failed' });
    });
  });
});
