import { Login } from '../functions/login.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Login', () => {
  let login;

  beforeEach(() => {
    login = new Login();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true when user exists', async () => {
    pool.query.mockResolvedValue({ rows: [{ email: 'a@b.com' }] });

    const result = await login.checkUser('a@b.com');

    expect(result).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT email FROM users WHERE email = $1 LIMIT 1',
      ['a@b.com']
    );
  });

  it('should return false when user does not exist', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await login.checkUser('missing@b.com');

    expect(result).toBe(false);
  });

  it('should return false on unexpected error', async () => {
    pool.query.mockRejectedValue(new Error('connection failed'));

    const result = await login.checkUser('a@b.com');

    expect(result).toBe(false);
  });
});
