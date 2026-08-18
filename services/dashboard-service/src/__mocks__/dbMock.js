/**
 * Creates a mock pg Pool client for testing.
 *
 * @param {object} options
 * @param {Array}  options.rows   - The rows array to return from pool.query
 * @returns {object} mock pool with query and connect methods
 */
export function createMockPool({ rows = [] } = {}) {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };

  return {
    query: jest.fn().mockResolvedValue({ rows }),
    connect: jest.fn().mockResolvedValue(mockClient),
    _mockClient: mockClient,
  };
}

/**
 * Shared default mock for the `../db.js` module.
 */
export const pool = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  }),
};
