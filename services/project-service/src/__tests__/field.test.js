import { Fields } from '../functions/field.js';
import { pool } from '../db.js';

jest.mock('../db.js');

describe('Fields', () => {
  let fields;

  beforeEach(() => {
    fields = new Fields();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addField', () => {
    it('should add a field successfully', async () => {
      pool.query.mockResolvedValue({ rows: [{ field_name: 'title' }] });

      const result = await fields.addField('a@b.com', 'entries', 'title', 'text', true);

      expect(result).toEqual({ success: true, message: 'Field added successfully' });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fields'),
        ['a@b.com', 'entries', 'title', 'text', true]
      );
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('insert failed'));

      const result = await fields.addField('a@b.com', 'entries', 'title', 'text', true);

      expect(result).toEqual({ success: false, message: 'insert failed' });
    });
  });

  describe('editField', () => {
    it('should edit a field successfully', async () => {
      pool.query.mockResolvedValue({ rows: [{ field_name: 'title', data_type: 'varchar' }] });

      const result = await fields.editField('a@b.com', 'entries', 'title', 'varchar', false);

      expect(result).toEqual({
        success: true,
        message: 'Field updated successfully',
        data: [{ field_name: 'title', data_type: 'varchar' }],
      });
    });

    it('should return failure when field is not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await fields.editField('a@b.com', 'entries', 'nonexistent', 'text', true);

      expect(result).toEqual({ success: false, message: 'Field not found. Something went wrong' });
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('update failed'));

      const result = await fields.editField('a@b.com', 'entries', 'title', 'text', true);

      expect(result).toEqual({ success: false, message: 'update failed' });
    });
  });

  describe('getFields', () => {
    it('should retrieve fields successfully', async () => {
      const mockData = [
        { field_name: 'title', data_type: 'text', is_required: true },
        { field_name: 'status', data_type: 'varchar', is_required: false },
      ];
      pool.query.mockResolvedValue({ rows: mockData });

      const result = await fields.getFields('a@b.com', 'entries');

      expect(result).toEqual({ success: true, message: 'Fields retrieved successfully', data: mockData });
    });

    it('should return empty array when no fields exist', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await fields.getFields('a@b.com', 'entries');

      expect(result).toEqual({ success: true, message: 'Fields retrieved successfully', data: [] });
    });

    it('should return failure when query throws an error', async () => {
      pool.query.mockRejectedValue(new Error('select failed'));

      const result = await fields.getFields('a@b.com', 'entries');

      expect(result).toEqual({ success: false, message: 'select failed' });
    });
  });
});
