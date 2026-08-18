import { pool } from '../db.js';

export class Search {
  async searchAll(user_email, keyword) {
    try {
      const result = await pool.query(
        'SELECT * FROM entries WHERE user_email = $1',
        [user_email]
      );

      const lowerKeyword = keyword.toLowerCase();
      const results = result.rows.filter((row) =>
        JSON.stringify(row.entries).toLowerCase().includes(lowerKeyword)
      );

      return { success: true, message: 'Entries retrieved successfully', data: results };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async searchProject(user_email, project_name, keyword) {
    try {
      const result = await pool.query(
        'SELECT * FROM entries WHERE user_email = $1 AND project_name = $2',
        [user_email, project_name]
      );

      const lowerKeyword = keyword.toLowerCase();
      const results = result.rows.filter((row) =>
        JSON.stringify(row.entries).toLowerCase().includes(lowerKeyword)
      );

      return { success: true, message: 'Entries retrieved successfully', data: results };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async searchProjects(user_email, keyword) {
    try {
      const projectsResult = await pool.query(
        'SELECT * FROM projects WHERE user_email = $1',
        [user_email]
      );

      const lowerKeyword = keyword.toLowerCase();
      const matchingProjects = projectsResult.rows.filter((project) =>
        project.project_name.toLowerCase().includes(lowerKeyword)
      );

      const results = [];
      for (const project of matchingProjects) {
        const entriesResult = await pool.query(
          'SELECT * FROM entries WHERE user_email = $1 AND project_name = $2',
          [user_email, project.project_name]
        );

        results.push(...entriesResult.rows);
      }

      return { success: true, message: 'Entries retrieved successfully', data: results };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }
}
