/**
 * When user signs up or logs in, this function is called to check if the user exists in the database.
 * If the user does not exist then return false so that frontend can direct them to create a profile.
 * If user does exist then return true so that frontend can direct them to the dashboard.
 */
import { pool } from '../db.js';

export class Login {
  async checkUser(email) {
    try {
      const result = await pool.query(
        'SELECT email FROM users WHERE email = $1 LIMIT 1',
        [email]
      );

      return result.rows.length > 0 ? true : false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
