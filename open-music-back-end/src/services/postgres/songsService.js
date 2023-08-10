const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/invariantError');
const { mapDBToModel } = require('../../utils');
const NotFoundError = require('../../exceptions/notFoundError');

class SongsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addSong({
    title, year, genre, performer, duration, albumId,
  }) {
    const id = `song-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, title, year, genre, performer, duration, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan');
    }

    await this._cacheService.delete(`songs:${title}-${performer}`);
    return result.rows[0].id;
  }

  async getSongs(title, performer) {
    try {
      // mendapatkan songs dari cache
      const result = await this._cacheService.get(`songs:${title}-${performer}`);
      const parsing = JSON.parse(result);
      return {
        cache: true,
        songs: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan songs dari database
      const query = {
        text: 'SELECT id, title, performer FROM songs WHERE title LIKE $1 OR performer LIKE $2',
        values: [`%${title}%`, `%${performer}%`],
      };

      const result = await this._pool.query(query);
      const getSongs = result.rows;

      // songs akan disimpan pada cache sebelum fungsi getSongs dikembalikan
      await this._cacheService.set(`songs:${title}-${performer}`, JSON.stringify(getSongs));

      return { cache: false, songs: getSongs };
    }
  }

  async getSongsByAlbumId(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE album_id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    return result.rows.map(mapDBToModel);
  }

  async getSongById(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };

    const { rows, rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }

    return rows.map(mapDBToModel)[0];
  }

  async editSongById(id, {
    title, year, genre, performer, duration, albumId,
  }) {
    const query = {
      text: 'UPDATE songs SET title = $1, year = $2, genre = $3, performer = $4, duration = $5, album_id = $6 WHERE id = $7 RETURNING id',
      values: [title, year, genre, performer, duration, albumId, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui lagu. Id tidak ditemukan');
    }

    await this._cacheService.delete(`songs:${title}-${performer}`);
  }

  async deleteSongById(id) {
    const { title, performer } = await this.getSongById(id);

    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal dihapus. Id tidak ditemukan');
    }

    await this._cacheService.delete(`songs:${title}-${performer}`);
  }
}

module.exports = SongsService;
