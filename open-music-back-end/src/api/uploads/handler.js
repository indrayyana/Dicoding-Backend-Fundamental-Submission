const autoBind = require("auto-bind");

class UploadsHandler {
  constructor(service, validator, albumsService) {
    this._service = service;
    this._albumsService = albumsService;
    this._validator = validator;

    autoBind(this);
  }

  async postUploadImageHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;
    this._validator.validateImageHeaders(cover.hapi.headers);

    await this._albumsService.getAlbumById(id);
    const filename = await this._service.writeFile(cover, cover.hapi);
    await this._albumService.addCoverUrlAlbum(
      id,
      `http://${process.env.HOST}:${process.env.PORT}/upload/images/${filename}`
    );

    const response = h.response({
      status: "success",
      data: {
        fileLocation: `http://${process.env.HOST}:${process.env.PORT}/upload/images/${filename}`,
      },
    });
    response.code(201);
    return response;
  }
}

module.exports = UploadsHandler;
