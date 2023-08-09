const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(playlistsService, songsService, validator) {
    this._playlistsService = playlistsService;
    this._songsService = songsService;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);

    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._playlistsService.addPlaylist({
      name,
      owner: credentialId,
    });

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { cache, playlists } = await this._playlistsService.getPlaylists(credentialId);

    const response = h.response({
      status: 'success',
      data: {
        playlists,
      },
    });

    if (cache) response.header('X-Data-Source', 'cache');
    return response;
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(id, credentialId);
    await this._playlistsService.deletePlaylistById(id);

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postPlaylistSongByIdHandler(request, h) {
    this._validator.validateSongPlaylistPayload(request.payload);

    const { songId } = request.payload;
    await this._songsService.getSongById(songId);

    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);
    await this._playlistsService.addSongToPlaylist(playlistId, songId);
    await this._playlistsService.addActivity(playlistId, songId, credentialId, 'add');

    const response = h.response({
      status: 'success',
      message: 'Musik berhasil ditambahkan ke dalam playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { cache, playlist } = await this._playlistsService.getPlaylistSongsById(id, credentialId);

    const response = h.response({
      status: 'success',
      data: {
        playlist,
      },
    });

    if (cache) response.header('X-Data-Source', 'cache');
    return response;
  }

  async deletePlaylistSongsByIdHandler(request) {
    this._validator.validateSongPlaylistPayload(request.payload);

    const { id } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(id, credentialId);
    await this._playlistsService.deleteSongFromPlaylist(id, songId);
    await this._playlistsService.addActivity(id, songId, credentialId, 'delete');

    return {
      status: 'success',
      message: 'Musik berhasil dihapus dari playlist',
    };
  }

  async getPlaylistActivitiesByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(id, credentialId);

    const { cache, activities } = await this._playlistsService.getPlaylistActivitiesById(id);

    const response = h.response({
      status: 'success',
      data: {
        playlistId: id,
        activities,
      },
    });

    if (cache) response.header('X-Data-Source', 'cache');
    return response;
  }
}

module.exports = PlaylistsHandler;
