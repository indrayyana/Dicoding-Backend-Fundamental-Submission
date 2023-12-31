const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/invariantError');
const NotFoundError = require('../../exceptions/notFoundError');
const AuthorizationError = require('../../exceptions/authorizationError');

class PlaylistsService {
  constructor(collaborationsService, cacheService) {
    this._pool = new Pool();
    this._collaborationsService = collaborationsService;
    this._cacheService = cacheService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const { rowCount, rows } = await this._pool.query(query);

    if (!rowCount) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    await this._cacheService.delete(`playlists:${owner}`);

    return rows[0].id;
  }

  async getPlaylists(owner) {
    try {
      // mendapatkan playlist dari cache
      const result = await this._cacheService.get(`playlists:${owner}`);
      const parsing = JSON.parse(result);

      return {
        cache: true,
        playlists: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan playlist dari database
      const query = {
        text: 'SELECT p.id, p.name, u.username FROM playlists AS p INNER JOIN users AS u ON p.owner = u.id WHERE p.owner = $1 UNION SELECT p.id, p.name, u.username FROM collaborations AS c INNER JOIN playlists AS p ON c.playlist_id = p.id INNER JOIN users u ON p.owner = u.id WHERE c.user_id = $1',
        values: [owner],
      };

      const { rows } = await this._pool.query(query);
      const getPlaylists = rows;

      // playlist akan disimpan pada cache sebelum fungsi getPlaylists dikembalikan
      await this._cacheService.set(`playlists:${owner}`, JSON.stringify(getPlaylists));

      return { cache: false, playlists: getPlaylists };
    }
  }

  async getPlaylistById(playlistId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    };

    const { rowCount, rows } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return rows[0];
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id, owner',
      values: [id],
    };

    const { rowCount, rows } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }

    const { owner } = rows[0];
    await this._cacheService.delete(`playlists:${owner}`);
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = `song_playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new InvariantError('Musik gagal ditambahkan kedalam playlist');
    }

    await this._cacheService.delete(`playlistSongs:${playlistId}`);
  }

  async getPlaylistSongsById(playlistId, userId) {
    await this.verifyPlaylistAccess(playlistId, userId);

    try {
      // mendapatkan playlist lagu dari cache
      const result = await this._cacheService.get(`playlistSongs:${playlistId}`);
      const parsing = JSON.parse(result);

      return {
        cache: true,
        playlist: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan playlist lagu dari database
      const queryGetPlaylist = {
        text: 'SELECT p.id, p.name, u.username FROM playlists AS p INNER JOIN users AS u ON p.owner = u.id WHERE p.id = $1',
        values: [playlistId],
      };
      const queryGetSongs = {
        text: 'SELECT s.id, s.title, s.performer FROM songs AS s INNER JOIN playlist_songs AS p ON p.song_id = s.id WHERE p.playlist_id = $1',
        values: [playlistId],
      };

      const playlistResult = await this._pool.query(queryGetPlaylist);
      const songsResult = await this._pool.query(queryGetSongs);

      if (!playlistResult.rowCount) {
        throw new NotFoundError('Playlist tidak ditemukan');
      }

      const data = playlistResult.rows[0];

      // Memunculkan daftar songs di dalam data playlist
      data.songs = songsResult.rows;

      const result = playlistResult.rows[0];

      // playlist lagu akan disimpan pada cache sebelum fungsi getPlaylistSongsById dikembalikan
      await this._cacheService.set(`playlistSongs:${playlistId}`, JSON.stringify(result));

      return { cache: false, playlist: result };
    }
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new InvariantError('Musik gagal dihapus dari playlist');
    }

    await this._cacheService.delete(`playlistSongs:${playlistId}`);
  }

  async getPlaylistActivitiesById(playlistId) {
    await this.getPlaylistById(playlistId);

    try {
      // mendapatkan aktivitas playlist  dari cache
      const result = await this._cacheService.get(`playlistActivities:${playlistId}`);
      const parsing = JSON.parse(result);

      return {
        cache: true,
        activities: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan aktivitas playlist dari database
      const query = {
        text: `SELECT u.username, s.title, a.action, a.time
      FROM playlist_song_activities AS a
      INNER JOIN songs AS s
      ON a.song_id = s.id
      INNER JOIN users AS u
      ON a.user_id = u.id
      WHERE playlist_id = $1
      ORDER BY a.time ASC`,
        values: [playlistId],
      };

      const { rows } = await this._pool.query(query);
      const playlistActivies = rows;

      // aktivitas playlist akan disimpan pada cache sebelum fungsi dikembalikan
      await this._cacheService.set(`playlistActivities:${playlistId}`, JSON.stringify(playlistActivies));

      return { cache: false, activities: playlistActivies };
    }
  }

  async addActivity(playlistId, songId, userId, action) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, userId, action, time],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new InvariantError('Gagal menambahkan activity');
    }

    await this._cacheService.delete(`playlistActivities:${playlistId}`);
  }

  async verifyPlaylistOwner(id, userId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const { rowCount, rows } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = rows[0];

    if (playlist.owner !== userId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
