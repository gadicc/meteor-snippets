/*
 * Adaptation of http://html2jade.vstark.net by Vincent Stark
 * Discussion: https://groups.google.com/forum/#!topic/meteor-talk/Hrmt8_tyawM
 * Source: https://github.com/vince-stark/html2jade-meteor/blob/master/meteor/server/server.js
 * Retrieved 2014-10-30, commit 3ac0eedb6d70adc1e15f57fd24482563ac8100b1
 * MIT Licensed
 *
 */

/* These next 3 functions are untouched from the original */

var u = Random.id().toLowerCase();

var preProcessHtml = function(html) {

  // Process markdown
  html = html.replace(/{{#markdown}}/g, '<!--\nmeteor-markdown\n');
  html = html.replace(/{{\/markdown}}/g, '-->');

  // Process comments
  html = html.replace(/{{! ?(.*)}}/g, '<meteor-comment>$1</meteor-comment>');
  html = html.replace(/{{!--/g, '<meteor-comment>');
  html = html.replace(/--}}/g, '</meteor-comment>');

  // Process templates
  html = html.replace(/{{> (.*?)}}/g, '<meteor-template-' + u + ' data=\'$1\'></meteor-template-' + u + '>');

  // Process statements
  html = html.replace(/{{#if (.*?)}}/g, '<meteor-if-' + u + ' data=\'$1\'>');
  html = html.replace(/{{#unless (.*?)}}/g, '<meteor-unless-' + u + ' data=\'$1\'>');
  html = html.replace(/{{#each (.*?)}}/g, '<meteor-each-' + u + ' data=\'$1\'>');
  html = html.replace(/{{#with (.*?)}}/g, '<meteor-with-' + u + ' data=\'$1\'>');
  html = html.replace(/{{#block}}/g, '<meteor-block-' + u + '>');
  html = html.replace(/{{else}}/g, '<meteor-else-' + u + '></meteor-else-' + u + '>');
  html = html.replace(/{{\/if}}/g, '</meteor-if-' + u + '>');
  html = html.replace(/{{\/unless}}/g, '</meteor-unless-' + u + '>');
  html = html.replace(/{{\/each}}/g, '</meteor-each-' + u + '>');
  html = html.replace(/{{\/with}}/g, '</meteor-with-' + u + '>');
  html = html.replace(/{{\/block}}/g, '</meteor-block-' + u + '>');

  // Process tags
  var t_match, a_match, v_match, sv_match;
  var tag_match  = /<[^!][^>]*?( .*?)>/g;
  var attr_match = /(\w+)="(.*?)"/g;
  var var_match  = /([^ ]*?{{.*?}})/g;
  var svar_match = / ({{.*?}})/g;

  while ((t_match = tag_match.exec(html))) {
    var tag = t_match[1];
    var new_tag = tag;

    // Process data attributes (attr="value")
    var meteor_attr = {};
    while ((a_match = attr_match.exec(tag))) {
      var attr = a_match[1];

      // Skip all other attributes
      if (attr !== 'class' && attr !== 'id') {
        continue;
      }

      var data = a_match[2];
      while ((v_match = var_match.exec(data))) {
        var variable = v_match[1];

        // Remove Meteor var from tag
        new_tag = new_tag.replace(variable, '');

        // Fill Meteor-specific attr/values
        meteor_attr[attr] = (meteor_attr[attr] === undefined ? '' : meteor_attr[attr] + ' ') + variable;
      }
    }

    // Process single attribute (attr)
    // As of now, Meteor's JADE allows just a single $dyn attribute
    sv_match = new_tag.match(svar_match);
    if (sv_match) {
      var svariable = sv_match[0].trim();

      // Remove Meteor var from tag
      new_tag = new_tag.replace(svariable, '');

      // Add dyn attribute
      new_tag = new_tag + ' ' + 'mdyn-' + u + '="' + svariable.replace(/{{|}}/g, '') + '"';
    }

    // Populate tag with properly wrapped Meteor vars
    /* jshint loopfunc: true */
    _.each(meteor_attr, function(v, k) {
      new_tag = new_tag + ' ' + 'mdata-' + k + '-' + u + '="' + v + '"';
    });
    /* jshint loopfunc: false */

    // Replace old tag with the new one
    if (new_tag !== tag) {
      html = html.replace(tag, new_tag);
    }
  }

  return html;
};

var postProcessJade = function(jade) {

  // Process markdown
  var m_match;
  var markdown, new_markdown;
  while ((m_match = jade.match(/\/\/\n *meteor-markdown\n((?: *\|(?:.*?)\n)+)/))) {
    markdown = m_match[1];
    new_markdown = markdown.replace(/(^ +)\| /gm, '$1');
    jade = jade.replace(markdown, new_markdown);
  }
  jade = jade.replace(/^ *\/\/\n  ( *)meteor-markdown\n/gm, '$1:markdown\n');

  // Process comments
  var c_match;
  var comment, new_comment;
  while ((c_match = jade.match(/meteor-comment\n((?: *\|(?:.*?)\n)+)/))) {
    comment = c_match[1];
    new_comment = comment.replace(/(^ +)\| /gm, '$1');
    jade = jade.replace(comment, new_comment);
  }
  jade = jade.replace(/^( *)meteor-comment$/gm, '$1//-');
  jade = jade.replace(/^( *)meteor-comment (.*)$/gm, '$1//- $2');

  // Process templates
  jade = jade.replace(new RegExp('meteor-template-' + u + '\\(data=\'(.*?)\'\\)', 'g'), '+$1');

  // Process statements
  jade = jade.replace(new RegExp('meteor-if-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'if $1');
  jade = jade.replace(new RegExp('meteor-unless-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'unless $1');
  jade = jade.replace(new RegExp('meteor-each-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'each $1');
  jade = jade.replace(new RegExp('meteor-with-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'with $1');
  jade = jade.replace(new RegExp('  meteor-else-' + u, 'g'), 'else');
  jade = jade.replace(new RegExp('meteor-block-' + u, 'g'), 'block');

  // Process tag variables
  jade = jade.replace(new RegExp('mdata-(\\w+)-' + u + '="(.*?)"', 'g'), '$1="$2"');
  jade = jade.replace(new RegExp('mdata-(\\w+)-' + u + '=\'(.*?)\'', 'g'), '$1="$2"');

  // Process dynamic attributes
  jade = jade.replace(new RegExp('mdyn-' + u + '=\'(.*?)\'', 'g'), '$dyn=$1');

  // Remove <html> tag: Meteor doesn't like it in templates
  jade = jade.split('\n').slice(1).join('\n');
  jade = jade.replace(/^  /gm, '');

  // Remove hanging spaces
  jade = jade.replace(/ *$/gm, '');

  return jade;
};

/* This is the original code that we don't use anymore */

/*

Meteor.methods({

  convertHtml: function(html) {
    if (html === '') { return ''; }
    html = preProcessHtml(html);
    var promise = Async.runSync(function(done) {
      html2jade.convertHtml(html, { scalate: true }, function(err, jade) {
        jade = postProcessJade(jade);
        done(err, jade);
      });
    });
    return promise.result;
  },

  getExample: function() {
    return fs.readFileSync('../web.browser/app/example.html', 'utf-8');
  }
});

*/

/* And this is our only actual change */

spacebars2jade = function(html) {
  if (html === '') { return ''; }

  html = preProcessHtml(html);

  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/xml");
	var converter = new Html2Jade.Converter({});
	var output = new Html2Jade.StringOutput();
	converter.document(doc, output);
	var jade = output.final();

	return postProcessJade(jade);
}
