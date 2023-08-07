const PlaylistsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'playlists',
  version: '1.0.0',
  register: async (server, { playlistsService, songsService, validator }) => {
    const playlistsHandler = new PlaylistsHandler(playlistsService, songsService, validator);
    server.route(routes(playlistsHandler));
  },
};
