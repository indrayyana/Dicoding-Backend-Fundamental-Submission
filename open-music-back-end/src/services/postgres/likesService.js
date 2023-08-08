const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/invariantError');
const NotFoundError = require('../../exceptions/notFoundError');

class LikesService {
  constructor() {
    this._pool = new Pool();
  }

  async likedAlbums(userId, albumId) {
    const query = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 and album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

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
    return message;
  }

  async getLikes(albumId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
      values: [albumId],
    };

    const result = await this._pool.query(query);
    const likeCount = result.rowCount;

    return { likes: likeCount };
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
    return message;
  }
}

module.exports = LikesService;
