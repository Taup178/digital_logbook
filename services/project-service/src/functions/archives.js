import { pool } from '../db.js';

export class Archives {
  async archive_project(user_email, project_name) {
    try {
      const query = 'UPDATE projects SET archived = true WHERE user_email = $1 AND project_name = $2';
      await pool.query(query, [user_email, project_name]);

      console.log('Project archived successfully');
      return { success: true, message: 'Project archived successfully' };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async unarchive_project(user_email, project_name) {
    try {
      const query = 'UPDATE projects SET archived = false WHERE user_email = $1 AND project_name = $2';
      await pool.query(query, [user_email, project_name]);

      console.log('Project unarchived successfully');
      return { success: true, message: 'Project unarchived successfully' };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async archive_entry(user_email, project_name, entry_id) {
    try {
      const query = 'UPDATE entries SET archived = true WHERE id = $1 AND user_email = $2 AND project_name = $3';
      await pool.query(query, [entry_id, user_email, project_name]);

      console.log('Entry archived successfully');
      return { success: true, message: 'Entry archived successfully' };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async unarchive_entry(user_email, project_name, entry_id) {
    try {
      const query = 'UPDATE entries SET archived = false WHERE id = $1 AND user_email = $2 AND project_name = $3';
      await pool.query(query, [entry_id, user_email, project_name]);

      console.log('Entry unarchived successfully');
      return { success: true, message: 'Entry unarchived successfully' };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async getArchives(user_email, project_name) {
    try {
      let query;
      let params;
      if (project_name) {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND archived = true AND project_name = $2';
        params = [user_email, project_name];
      } else {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND archived = true';
        params = [user_email];
      }

      const result = await pool.query(query, params);

      return { success: true, data: result.rows };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async getUnarchived(user_email, project_name) {
    try {
      let query;
      let params;
      if (project_name) {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL) AND project_name = $2';
        params = [user_email, project_name];
      } else {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL)';
        params = [user_email];
      }

      const result = await pool.query(query, params);

      return { success: true, data: result.rows };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }
}
