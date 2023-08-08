const autoBind = require('auto-bind');

class LikesHandler {
  constructor(likesService, albumsService) {
    this._service = likesService;
    this._albumService = albumsService;

    autoBind(this);
  }

  async postLikeAlbumHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { id } = request.params;

    await this._albumService.getAlbumById(id);
    const message = await this._service.likedAlbums(credentialId, id);

    const response = h.response({
      status: 'success',
      message,
    });
    response.code(201);
    return response;
  }

  async getLikeAlbumHandler(request, h) {
    const { id } = request.params;
    await this._albumService.getAlbumById(id);

    const { likes } = await this._service.getLikes(id);

    const response = h.response({
      status: 'success',
      data: {
        likes,
      },
    });
    return response;
  }

  async deleteLikeAlbumHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { id } = request.params;

    await this._albumService.getAlbumById(id);
    const message = await this._service.deleteLike(credentialId, id);

    const response = h.response({
      status: 'success',
      message,
    });
    return response;
  }
}

module.exports = LikesHandler;
