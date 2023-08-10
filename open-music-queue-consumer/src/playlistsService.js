const { Pool } = require('pg');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
  }

  async getPlaylistSongsById(playlistId) {
    const queryGetPlaylist = {
      text: 'SELECT p.id, p.name FROM playlists AS p INNER JOIN users AS u ON p.owner = u.id WHERE p.id = $1',
      values: [playlistId],
    };
    const queryGetSongs = {
      text: 'SELECT s.id, s.title, s.performer FROM songs AS s INNER JOIN playlist_songs AS p ON p.song_id = s.id WHERE p.playlist_id = $1',
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(queryGetPlaylist);
    const songsResult = await this._pool.query(queryGetSongs);

    const data = playlistResult.rows[0];
    data.songs = songsResult.rows;

    const result = playlistResult.rows[0];

    return { playlist: result };
  }
}

module.exports = PlaylistsService;
