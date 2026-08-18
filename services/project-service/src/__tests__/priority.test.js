import { Priority } from '../functions/priority.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Priority', () => {
  let priority;

  beforeEach(() => {
    priority = new Priority();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set priority to "Urgent and important" for value 0', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await priority.setPriority('a@b.com', 0, 'P1', 1);

    expect(result).toEqual({ success: true, message: 'Priority set to Urgent and important' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE entries SET priority = $1 WHERE id = $2 AND user_email = $3 AND project_name = $4',
      ['Urgent and important', 1, 'a@b.com', 'P1']
    );
  });

  it('should set priority to "Urgent but not important" for value 1', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await priority.setPriority('a@b.com', '1', 'P1', 1);

    expect(result).toEqual({ success: true, message: 'Priority set to Urgent but not important' });
  });

  it('should set priority to "Not urgent, not important" for value 2', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await priority.setPriority('a@b.com', 2, 'P1', 1);

    expect(result).toEqual({ success: true, message: 'Priority set to Not urgent, not important' });
  });

  it('should remove priority for value 3 (set to null)', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await priority.setPriority('a@b.com', 3, 'P1', 1);

    expect(result).toEqual({ success: true, message: 'Priority set to none' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE entries SET priority = $1 WHERE id = $2 AND user_email = $3 AND project_name = $4',
      [null, 1, 'a@b.com', 'P1']
    );
  });

  it('should return failure for invalid priority value', async () => {
    const result = await priority.setPriority('a@b.com', 99, 'P1', 1);

    expect(result).toEqual({ success: false, message: 'Invalid priority value' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should return failure when query throws an error', async () => {
    pool.query.mockRejectedValue(new Error('update failed'));

    const result = await priority.setPriority('a@b.com', 1, 'P1', 1);

    expect(result).toEqual({ success: false, message: 'update failed' });
  });
});
