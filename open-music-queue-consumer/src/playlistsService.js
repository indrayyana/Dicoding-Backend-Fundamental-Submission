const { Pool } = require('pg');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
  }

  async getPlaylists(userId) {
    console.log(userId);

    const query = {
      text: 'SELECT p.id, p.name, u.username FROM playlists AS p INNER JOIN users AS u ON p.owner = u.id WHERE p.owner = $1 UNION SELECT p.id, p.name, u.username FROM collaborations AS c INNER JOIN playlists AS p ON c.playlist_id = p.id INNER JOIN users u ON p.owner = u.id WHERE c.user_id = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);

    return result.rows[0];
  }
}

module.exports = PlaylistsService;
