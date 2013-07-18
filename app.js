var requirejs = require('requirejs');

requirejs.config({
  baseUrl: __dirname,
  nodeRequire: require,
  paths: {
    lib: "./lib",
    server: "./server",
    underscore: "./vendor/underscore"
  }
});

Raven = require('raven');

requirejs(['lib/raven/bridge'], function(Ravenbridge) {

  ic = Raven.init(Ravenbridge);

  ic.configure({
    send_index: function(request, response) {
      response.sendfile('/index.html', { root: __dirname });
    },
    send_asset: function(request, response, path) {
      response.sendfile(path, { root: __dirname });
    }
  });

  ic.run();

});
