const autoBind = require('auto-bind');
const PlaylistsService = require('../../services/postgres/playlistsService');

class ExportsHandler {
  constructor(exportsService, validator) {
    this._exportsService = exportsService;
    this._playlistsService = new PlaylistsService();
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload);
    const { id: userId } = request.auth.credentials.id;

    const { playlistId } = request.params;
    await this._playlistsService.verifyPlaylistAccess(playlistId, userId);

    const message = {
      playlistId,
      targetEmail: request.payload.targetEmail,
    };

    await this._exportsService.sendMessage('export:playlists', JSON.stringify(message));

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
