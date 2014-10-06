Package.describe({
  name: "gadicohen:snippets",
  summary: 'Code snippets with highlighting and lang conversion',
  version: "0.0.1",
  git: "https://github.com/gadicc/meteor-snippets.git"
});

Package.on_use(function (api) {
  api.use('blaze@2.0.0');
  api.use('templating@1.0.0');
  api.use('session@1.0.0');

  api.use('gadicohen:prism@1.0.3');

  // TODO, make separate package
  // https://github.com/js2coffee/js2coffee
  api.add_files('lib/js2coffee-0.3.1.js', 'client');

  api.add_files('lib/html2jade.js', 'client');

  api.add_files(['snippets.html', 'snippets.css', 'snippets.js'], 'client');
});