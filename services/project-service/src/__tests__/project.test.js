import { Project } from '../functions/project.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Project', () => {
  let project;

  beforeEach(() => {
    project = new Project();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── addProject ──────────────────────────────────────────────
  describe('addProject', () => {
    it('should add a project successfully', async () => {
      pool.query.mockResolvedValue({ rows: [{ user_email: 'a@b.com', project_name: 'My Project' }] });

      const result = await project.addProject('a@b.com', 'My Project');

      expect(result).toEqual({ success: true, message: 'Project added successfully' });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        ['a@b.com', 'My Project', undefined]
      );
    });

    it('should add a project with a description', async () => {
      pool.query.mockResolvedValue({ rows: [{ user_email: 'a@b.com', project_name: 'My Project', description: 'A test project' }] });

      const result = await project.addProject('a@b.com', 'My Project', 'A test project');

      expect(result).toEqual({ success: true, message: 'Project added successfully' });
    });

    it('should return a clear error when the project name is a duplicate', async () => {
      const pgError = new Error('duplicate key value violates unique constraint');
      pgError.code = '23505';
      pool.query.mockRejectedValue(pgError);

      const result = await project.addProject('a@b.com', 'My Project');

      expect(result).toEqual({ success: false, message: 'A project with this name already exists for your account.' });
    });

    it('should return failure on other database errors', async () => {
      pool.query.mockRejectedValue(new Error('connection failed'));

      const result = await project.addProject('a@b.com', 'Test');

      expect(result).toEqual({ success: false, message: 'connection failed' });
    });
  });

  // ─── editProjectName ─────────────────────────────────────────
  describe('editProjectName', () => {
    it('should update entries, fields and project name successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const result = await project.editProjectName('a@b.com', 'New Name', 'Old Name');

      expect(result).toEqual({ success: true, message: 'Project name updated successfully' });
      // BEGIN, UPDATE entries, UPDATE fields, UPDATE projects, COMMIT = 5 calls
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback when entries update fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('entries update failed')),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const result = await project.editProjectName('a@b.com', 'New', 'Old');

      expect(result).toEqual({ success: false, message: 'entries update failed' });
      // Should have called ROLLBACK
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback when fields update fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // UPDATE entries
          .mockRejectedValueOnce(new Error('fields update failed')),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const result = await project.editProjectName('a@b.com', 'New', 'Old');

      expect(result).toEqual({ success: false, message: 'fields update failed' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ─── getProjectsByEmail ──────────────────────────────────────
  describe('getProjectsByEmail', () => {
    it('should retrieve projects for a user', async () => {
      pool.query.mockResolvedValue({
        rows: [{ project_name: 'P1', description: 'desc', created_at: '2026-01-01', archived: false }],
      });

      const result = await project.getProjectsByEmail('a@b.com');

      expect(result.success).toBe(true);
      expect(result.projects).toEqual([{ project_name: 'P1', description: 'desc', created_at: '2026-01-01', archived: false }]);
    });

    it('should return empty array when no projects exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await project.getProjectsByEmail('a@b.com');

      expect(result).toEqual({ success: true, projects: [] });
    });

    it('should return failure on error', async () => {
      pool.query.mockRejectedValue(new Error('query failed'));

      const result = await project.getProjectsByEmail('a@b.com');

      expect(result).toEqual({ success: false, message: 'query failed' });
    });
  });

  // ─── deleteProject ───────────────────────────────────────────
  describe('deleteProject', () => {
    it('should delete entries, fields and project successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const result = await project.deleteProject('a@b.com', 'My Project');

      expect(result).toEqual({ success: true, message: 'Project deleted successfully' });
      // BEGIN, DELETE entries, DELETE fields, DELETE projects, COMMIT = 5 calls
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback when entries delete fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('entries delete failed')),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const result = await project.deleteProject('a@b.com', 'My Project');

      expect(result).toEqual({ success: false, message: 'entries delete failed' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle unexpected thrown errors', async () => {
      pool.connect.mockRejectedValue(new Error('Connection lost'));

      const result = await project.deleteProject('a@b.com', 'My Project');

      expect(result).toEqual({ success: false, message: 'Connection lost' });
    });
  });
});
