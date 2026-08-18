import { pool } from '../db.js';

const PRIORITY = Object.freeze({
  0: 'Urgent and important',
  1: 'Urgent but not important',
  2: 'Not urgent, not important',
});

export class Priority {
  async setPriority(user_email, priorityValue, project_name, entry_id) {
    try {
      let newPriority;
      switch (String(priorityValue)) {
        case '0':
          newPriority = PRIORITY[0];
          break;
        case '1':
          newPriority = PRIORITY[1];
          break;
        case '2':
          newPriority = PRIORITY[2];
          break;
        case '3':
          newPriority = null;
          break;
        default:
          return { success: false, message: 'Invalid priority value' };
      }

      const query = 'UPDATE entries SET priority = $1 WHERE id = $2 AND user_email = $3 AND project_name = $4';
      await pool.query(query, [newPriority, entry_id, user_email, project_name]);

      const label = newPriority || 'none';
      return { success: true, message: `Priority set to ${label}` };
    } catch (error) {
      console.log(error);
      return { success: false, message: error.message };
    }
  }
}
