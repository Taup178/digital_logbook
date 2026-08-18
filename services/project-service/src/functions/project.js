import { pool } from '../db.js';

export class Project {
  async addProject(user_email, project_name, description) {
    try {
      const query = 'INSERT INTO projects (user_email, project_name, description) VALUES ($1, $2, $3) RETURNING *';
      const result = await pool.query(query, [user_email, project_name, description]);

      console.log('Project added successfully');
      return { success: true, message: 'Project added successfully' };
    } catch (error) {
      // 23505 = unique_violation (e.g. duplicate project name for this user)
      if (error.code === '23505') {
        return { success: false, message: 'A project with this name already exists for your account.' };
      }
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async editProjectName(user_email, new_project_name, old_project_name) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update related entries first
      await client.query(
        'UPDATE entries SET project_name = $1 WHERE project_name = $2 AND user_email = $3',
        [new_project_name, old_project_name, user_email]
      );

      // Update the custom fields tied to this project (table_name == project_name)
      await client.query(
        'UPDATE fields SET table_name = $1 WHERE table_name = $2 AND user_email = $3',
        [new_project_name, old_project_name, user_email]
      );

      // Then update the project record
      await client.query(
        'UPDATE projects SET project_name = $1 WHERE project_name = $2 AND user_email = $3',
        [new_project_name, old_project_name, user_email]
      );

      await client.query('COMMIT');
      console.log('Project name updated successfully');
      return { success: true, message: 'Project name updated successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(error);
      return { success: false, message: error.message };
    } finally {
      client.release();
    }
  }

  async getProjectsByEmail(user_email) {
    try {
      const query = 'SELECT project_name, description, created_at, archived FROM projects WHERE user_email = $1 ORDER BY created_at DESC';
      const result = await pool.query(query, [user_email]);

      return { success: true, projects: result.rows || [] };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async deleteProject(user_email, project_name) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM entries WHERE project_name = $1 AND user_email = $2',
        [project_name, user_email]
      );

      // Delete custom fields tied to this project (table_name == project_name)
      await client.query(
        'DELETE FROM fields WHERE table_name = $1 AND user_email = $2',
        [project_name, user_email]
      );

      await client.query(
        'DELETE FROM projects WHERE project_name = $1 AND user_email = $2',
        [project_name, user_email]
      );

      await client.query('COMMIT');
      console.log('Project deleted successfully');
      return { success: true, message: 'Project deleted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(error);
      return { success: false, message: error.message };
    } finally {
      client.release();
    }
  }
}
