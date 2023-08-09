const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/invariantError');
const NotFoundError = require('../../exceptions/notFoundError');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('album gagal ditambahkan');
    }

    await this._cacheService.delete(`album:${id}`);
    return result.rows[0].id;
  }

  async getAlbumById(id) {
    try {
      // mendapatkan album dari cache
      const result = await this._cacheService.get(`album:${id}`);
      const parsing = JSON.parse(result);
      return {
        cache: true,
        album: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan album dari database
      const query = {
        text: 'SELECT * FROM albums WHERE id = $1',
        values: [id],
      };

      const result = await this._pool.query(query);

      if (!result.rowCount) {
        throw new NotFoundError('album tidak ditemukan');
      }

      const getAlbum = result.rows[0];

      // album akan disimpan pada cache sebelum fungsi getAlbumById dikembalikan
      await this._cacheService.set(`album:${id}`, JSON.stringify(getAlbum));

      return { cache: false, album: getAlbum };
    }
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id',
      values: [name, year, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album:${id}`);
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM Albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('album gagal dihapus. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album:${id}`);
  }

  async addCoverUrlAlbum(id, dir) {
    const query = {
      text: 'UPDATE albums SET cover = $1 WHERE id = $2 RETURNING id',
      values: [dir, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('album gagal ditambahkan, album tidak ditemukan');
    }

    await this._cacheService.delete(`album:${id}`);
  }
}

module.exports = AlbumsService;
