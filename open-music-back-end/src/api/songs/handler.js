const autoBind = require('auto-bind');

class SongsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postSongHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const songId = await this._service.addSong(request.payload);

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan',
      data: {
        songId,
      },
    });
    response.code(201);

    return response;
  }

  async getSongsHandler(request, h) {
    const { title = '', performer = '' } = request.query;
    const { cache, songs } = await this._service.getSongs(title, performer);

    let filteredSongs = songs;

    // Jika 'title' or 'performer' ada, maka filter lagu berdasarkan kondisi pencarian
    if (title || performer) {
      filteredSongs = songs.filter((song) => {
        // Filter lagu berdasarkan title dan performer dengan mengabaikan perbedaan kapitalisasi
        const isTitleMatch = song.title.toLowerCase().includes(title);
        const isPerformerMatch = song.performer.toLowerCase().includes(performer);
        return isTitleMatch && isPerformerMatch;
      });
    }

    // Jika title and performer ada, batasi hasil ke 1 lagu, else batasi hasil ke 2 lagu
    if (title && performer) {
      filteredSongs = filteredSongs.slice(0, 1);
    } else {
      filteredSongs = filteredSongs.slice(0, 2);
    }

    const response = h.response({
      status: 'success',
      data: {
        songs: filteredSongs,
      },
    });

    if (cache) response.header('X-Data-Source', 'cache');

    return response;
  }

  async getSongByIdHandler(request) {
    const { id } = request.params;
    const song = await this._service.getSongById(id);

    return {
      status: 'success',
      data: {
        song,
      },
    };
  }

  async putSongByIdHandler(request) {
    this._validator.validateSongPayload(request.payload);
    const { id } = request.params;

    await this._service.editSongById(id, request.payload);

    return {
      status: 'success',
      message: 'Lagu berhasil diperbarui',
    };
  }

  async deleteSongByIdHandler(request) {
    const { id } = request.params;

    await this._service.deleteSongById(id);

    return {
      status: 'success',
      message: 'Lagu berhasil dihapus',
    };
  }
}

module.exports = SongsHandler;
