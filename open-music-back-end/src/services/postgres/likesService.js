const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/invariantError');
const NotFoundError = require('../../exceptions/notFoundError');

class LikesService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async likedAlbums(userId, albumId) {
    const query = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 and album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    // tambahkan like jika like belum tersedia di database
    if (!result.rowCount) {
      const message = await this.addLike(userId, albumId);

      return message;
    }

    // Jika pengguna mencoba menyukai album yang sama lagi, lempar InvariantError
    throw new InvariantError('Anda sudah menyukai album ini');
  }

  async addLike(userId, albumId) {
    const id = `likes-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('gagal menyukai album');
    }

    const message = 'Like Album berhasil';

    await this._cacheService.delete(`likes:${albumId}`);

    return message;
  }

  async getLikes(albumId) {
    try {
      // mendapatkan likes dari cache
      const result = await this._cacheService.get(`likes:${albumId}`);
      const parsing = JSON.parse(result);

      return {
        cache: true,
        likes: parsing,
      };
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan likes dari database
      const query = {
        text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };

      const result = await this._pool.query(query);
      const likeCount = result.rowCount;

      // likes akan disimpan pada cache sebelum fungsi getLikes dikembalikan
      await this._cacheService.set(`likes:${albumId}`, JSON.stringify(likeCount));

      return { cache: false, likes: likeCount };
    }
  }

  async deleteLike(userId, albumId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 and album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('status like tidak ditemukan');
    }

    const message = 'status like berhasil dihapus';

    await this._cacheService.delete(`likes:${albumId}`);

    return message;
  }
}

module.exports = LikesService;
