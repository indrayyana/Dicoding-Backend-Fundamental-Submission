const ExportsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'exports',
  version: '1.0.0',
  register: async (server, { exportsService, validator }) => {
    const exportsHandler = new ExportsHandler(exportsService, validator);
    server.route(routes(exportsHandler));
  },
};
