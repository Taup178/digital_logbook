import { Username, Email, Name, Avatar, Profile } from '../functions/profile.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Profile service functions', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Username ────────────────────────────────────────────────
  describe('Username', () => {
    it('should update username when it is available', async () => {
      // First call: check if username exists (returns empty)
      // Second call: update the username
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const username = new Username();
      const result = await username.username('a@b.com', 'newuser');

      expect(result).toEqual({ success: true, message: 'Username updated successfully' });
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT username FROM users WHERE username = $1',
        ['newuser']
      );
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET username = $1 WHERE email = $2',
        ['newuser', 'a@b.com']
      );
    });

    it('should reject username when it is taken', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ username: 'newuser' }] });

      const username = new Username();
      const result = await username.username('a@b.com', 'newuser');

      expect(result).toEqual({ success: false, message: 'Username not available' });
    });

    it('should return failure on error', async () => {
      pool.query.mockRejectedValue(new Error('db error'));

      const username = new Username();
      const result = await username.username('a@b.com', 'newuser');

      expect(result.success).toBe(false);
      expect(result.message).toBe('db error');
    });
  });

  // ─── Email ───────────────────────────────────────────────────
  describe('Email', () => {
    it('should insert a new email successfully', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const email = new Email();
      const result = await email.email('a@b.com');

      expect(result).toEqual({ success: true, message: 'Email added successfully' });
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, username, name) VALUES ($1, $2, $3)',
        ['a@b.com', 'a_b', 'a_b']
      );
    });

    it('should return failure when insert fails', async () => {
      pool.query.mockRejectedValue(new Error('duplicate key'));

      const email = new Email();
      const result = await email.email('a@b.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('duplicate key');
    });
  });

  // ─── Name ────────────────────────────────────────────────────
  describe('Name', () => {
    it('should update name successfully', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const name = new Name();
      const result = await name.name('a@b.com', 'New Name');

      expect(result).toEqual({ success: true, message: 'Name updated successfully' });
    });

    it('should return failure when update fails', async () => {
      pool.query.mockRejectedValue(new Error('update failed'));

      const name = new Name();
      const result = await name.name('a@b.com', 'New Name');

      expect(result.success).toBe(false);
      expect(result.message).toBe('update failed');
    });
  });

  // ─── Avatar ──────────────────────────────────────────────────
  describe('Avatar', () => {
    it('should update avatar successfully', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const avatar = new Avatar();
      const result = await avatar.avatar('a@b.com', 'http://avatar.url');

      expect(result).toEqual({ success: true, message: 'Avatar updated successfully' });
    });

    it('should return failure when update fails', async () => {
      pool.query.mockRejectedValue(new Error('update failed'));

      const avatar = new Avatar();
      const result = await avatar.avatar('a@b.com', 'http://avatar.url');

      expect(result.success).toBe(false);
      expect(result.message).toBe('update failed');
    });
  });

  // ─── Profile ─────────────────────────────────────────────────
  describe('Profile', () => {
    it('should fetch a profile successfully', async () => {
      pool.query.mockResolvedValue({
        rows: [{ email: 'a@b.com', username: 'user', name: 'Name' }],
      });

      const profile = new Profile();
      const result = await profile.getProfile('a@b.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ email: 'a@b.com', username: 'user', name: 'Name' });
    });

    it('should return failure when profile not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const profile = new Profile();
      const result = await profile.getProfile('a@b.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Profile not found');
    });

    it('should return failure on error', async () => {
      pool.query.mockRejectedValue(new Error('not found'));

      const profile = new Profile();
      const result = await profile.getProfile('a@b.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('not found');
    });

    it('should delete profile and related rows successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const profile = new Profile();
      const result = await profile.deleteProfile('a@b.com');

      expect(result).toEqual({ success: true, message: 'Profile deleted successfully' });
      // BEGIN, DELETE entries, DELETE fields, DELETE projects, DELETE users, COMMIT = 6 calls
      expect(mockClient.query).toHaveBeenCalledTimes(6);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback when delete fails', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // DELETE entries
          .mockRejectedValueOnce(new Error('delete failed')), // DELETE fields fails
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      const profile = new Profile();
      const result = await profile.deleteProfile('a@b.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('delete failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
