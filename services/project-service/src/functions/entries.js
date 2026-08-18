import { pool } from '../db.js';

export class Entries {
  async addEntry(user_email, project_name, entry_object, due_date, priority, status, started_at, ended_at, duration) {
    try {
      const columns = ['user_email', 'project_name', 'entries'];
      const values = [user_email, project_name, entry_object];
      let paramIndex = 3;

      if (due_date !== undefined && due_date !== null) { columns.push('due_date'); values.push(due_date); paramIndex++; }
      if (priority !== undefined && priority !== null) { columns.push('priority'); values.push(priority); paramIndex++; }
      if (status !== undefined && status !== null) { columns.push('status'); values.push(status); paramIndex++; }
      if (started_at !== undefined && started_at !== null) { columns.push('started_at'); values.push(started_at); paramIndex++; }
      if (ended_at !== undefined && ended_at !== null) { columns.push('ended_at'); values.push(ended_at); paramIndex++; }
      if (duration !== undefined && duration !== null) { columns.push('duration'); values.push(duration); paramIndex++; }

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.join(', ');

      console.log('[addEntry] Inserting:', JSON.stringify({ user_email, project_name, entries: entry_object }));

      const query = `INSERT INTO entries (${columnList}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(query, values);

      console.log('[addEntry] Success, id:', result.rows[0]?.id);
      return { success: true, message: 'Entry added successfully', data: result.rows };
    } catch (error) {
      console.error('[addEntry] FAILED:', error.message);
      return { success: false, message: error.message };
    }
  }

  async updateEntry(user_email, project_name, entry_id, new_entry, due_date, priority, status, started_at, ended_at, duration) {
    try {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      if (new_entry !== undefined && new_entry !== null) {
        setClauses.push(`entries = $${paramIndex++}`); values.push(new_entry);
      }
      if (due_date !== undefined) { setClauses.push(`due_date = $${paramIndex++}`); values.push(due_date); }
      if (priority !== undefined) { setClauses.push(`priority = $${paramIndex++}`); values.push(priority); }
      if (status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(status); }
      if (started_at !== undefined && started_at !== null) { setClauses.push(`started_at = $${paramIndex++}`); values.push(started_at); }
      if (ended_at !== undefined && ended_at !== null) { setClauses.push(`ended_at = $${paramIndex++}`); values.push(ended_at); }
      // duration is computed by the database — never set it explicitly

      if (setClauses.length === 0) {
        return { success: true, message: 'No changes to update' };
      }

      values.push(entry_id, user_email, project_name);
      const query = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_email = $${paramIndex++} AND project_name = $${paramIndex} RETURNING *`;

      console.log('[updateEntry] Updating entry_id:', entry_id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        console.error('[updateEntry] No rows matched. id:', entry_id, 'user:', user_email, 'project:', project_name);
        return { success: false, message: 'Entry not found. Check that the entry exists and belongs to this user/project.' };
      }

      console.log('[updateEntry] Success, id:', result.rows[0].id);
      return { success: true, message: 'Entry updated successfully', data: result.rows };
    } catch (error) {
      console.error('[updateEntry] FAILED:', error.message);
      return { success: false, message: error.message };
    }
  }

  async getEntries(user_email, project_name) {
    try {
      const query = 'SELECT * FROM entries WHERE user_email = $1 AND project_name = $2 ORDER BY created_at DESC';
      const result = await pool.query(query, [user_email, project_name]);

      return { success: true, message: 'Entries retrieved successfully', data: result.rows };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async getAllEntries(user_email) {
    try {
      const query = 'SELECT * FROM entries WHERE user_email = $1 ORDER BY created_at DESC';
      const result = await pool.query(query, [user_email]);

      return { success: true, message: 'All entries retrieved successfully', data: result.rows };
    } catch (error) {
      console.log('getAllEntries error:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteEntry(user_email, project_name, entry) {
    try {
      const query = 'DELETE FROM entries WHERE user_email = $1 AND project_name = $2 AND entries = $3 RETURNING *';
      const result = await pool.query(query, [user_email, project_name, entry]);

      if (result.rows.length === 0) {
        console.log('Entry not found for delete');
        return { success: false, message: 'Entry not found. Something went wrong' };
      }

      console.log('Entry deleted successfully');
      return { success: true, message: 'Entry deleted successfully' };
    } catch (error) {
      console.log('deleteEntry error:', error);
      return { success: false, message: error.message };
    }
  }

  async sortUnarchivedEntries(user_email, project_name, sort_type) {
    try {
      let query;
      let params;
      if (project_name) {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL) AND project_name = $2 ORDER BY due_date ASC';
        params = [user_email, project_name];
      } else {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND (archived = false OR archived IS NULL) ORDER BY due_date ASC';
        params = [user_email];
      }

      const result = await pool.query(query, params);
      const data = result.rows;

      switch (sort_type) {
        case 0: // sort by due date ascending
          return { success: true, message: 'Unarchived entries sorted successfully', data };

        case 1: { // sort by priority
          const results = [];
          const priorityOrder = [
            'Urgent and important',
            'Urgent but not important',
            'Not urgent, not important',
          ];

          priorityOrder.forEach((priority) => {
            data.forEach((row) => {
              if (row.priority === priority) {
                results.push(row);
              }
            });
          });

          return { success: true, message: 'Unarchived entries sorted successfully', data: results };
        }

        default:
          return { success: true, message: 'Unarchived entries sorted successfully', data };
      }
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }

  async sortArchivedEntries(user_email, project_name, sort_type) {
    try {
      let query;
      let params;
      if (project_name) {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND archived = true AND project_name = $2 ORDER BY due_date ASC';
        params = [user_email, project_name];
      } else {
        query = 'SELECT * FROM entries WHERE user_email = $1 AND archived = true ORDER BY due_date ASC';
        params = [user_email];
      }

      const result = await pool.query(query, params);
      const data = result.rows;

      switch (sort_type) {
        case 0: // sort by due date ascending
          return { success: true, message: 'Archived entries sorted successfully', data };

        case 1: { // sort by priority
          const results = [];
          const priorityOrder = [
            'Urgent and important',
            'Urgent but not important',
            'Not urgent, not important',
          ];

          priorityOrder.forEach((priority) => {
            data.forEach((row) => {
              if (row.priority === priority) {
                results.push(row);
              }
            });
          });

          return { success: true, message: 'Archived entries sorted successfully', data: results };
        }

        default:
          return { success: true, message: 'Archived entries sorted successfully', data };
      }
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }
}
