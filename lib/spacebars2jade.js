/*
 * Adaptation of http://html2jade.vstark.net by Vincent Stark
 * Discussion: https://groups.google.com/forum/#!topic/meteor-talk/Hrmt8_tyawM
 * Source: https://github.com/vince-stark/html2jade-meteor/blob/master/meteor/server/server.js
 * Retrieved 2014-10-30, commit 3ac0eedb6d70adc1e15f57fd24482563ac8100b1
 * MIT Licensed
 *
 */

var u = Random.id().toLowerCase();
var builtins = ['if','unless','each','with'];

var preProcessHtml = function(html) {
  // <template> is interpretted in a special way by DOMParser
  html = html.replace(/<template +name/g, '<spacebars_template name');
  html = html.replace(/<\/template>/g, '</spacebars_template>');

  // Process comments
  html = html.replace(/{{! ?(.*)}}/g, '<meteor-comment>$1</meteor-comment>');
  html = html.replace(/{{!--/g, '<meteor-comment>');
  html = html.replace(/--}}/g, '</meteor-comment>');

  // Process {template,component} inclusion
  html = html.replace(/{{> ?([\s\S]*?)}}/g, '<meteor-include-' + u + ' data=\'$1\'></meteor-include-' + u + '>');

  // Block helpers
  html = html.replace(/\{\{#([^ }]+)( ?[\s\S]*?)\}\}/g,
    function(match, name, attrs) {
      return '<meteor-block-' + name + '-' + u +
        (builtins.indexOf(name) === -1 ?
          ' _origName="'+name+'"' : '') + attrs + '>';
    });
  html = html.replace(/\{\{\/([^ }]+)\}\}/g, '</meteor-block-$1-' + u + '>');
  /*
  html = html.replace(/\{\{#([^ \}]+)( ?[^ }]*)\}\}([\s\S]*?)\{\{\/\1\}\}/,
    '<meteor-block-' + u + ' __jadeBlockName="$1"$2>$3</meteor-block-' + u + '>');
  html = html.replace(/{{else}}/g, '<meteor-else-' + u + '></meteor-else-' + u + '>');
  */

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

  //console.log(html);
  return html;
};

var postProcessJade = function(jade) {
  // <template>
  jade = jade.replace(/spacebars_template\(name/g, 'template(name');


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
  jade = jade.replace(new RegExp('meteor-include-' + u + '\\(data=\'([\\s\\S]*?)\'\\)', 'g'), '+$1');

  // Process statements
  /*
  jade = jade.replace(new RegExp('meteor-if-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'if $1');
  jade = jade.replace(new RegExp('meteor-unless-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'unless $1');
  jade = jade.replace(new RegExp('meteor-each-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'each $1');
  jade = jade.replace(new RegExp('meteor-with-' + u + '\\(data=\'(.*?)\'\\)', 'g'), 'with $1');
  jade = jade.replace(new RegExp('meteor-block-' + u, 'g'), 'block');
  */
  jade = jade.replace(new RegExp('meteor-block-(.*?)-' + u + '( ?.*)$', 'gm'),
    function(match, name, attrs) {
      if (builtins.indexOf(name) !== -1)
        return name + attrs;
      return attrs.replace(/^(\#\w*)?(\..*)?\((.*)\)$/,
        function(match, classes, id, attrs) {
          attrs = attrs.split(', ');
          name = attrs.shift().split('=')[1];     // _origname is always first
          name = name.substr(1, name.length-2);   // strip quotes
          var tmp;
          if (attrs.length==1 && (tmp = attrs[0].split('='))[1] == "''")
            attrs[0] = tmp[0];                    // single arg data context
          return '+' + name + (id || '') + (classes || '')
            + ' ' + attrs.join(' ');
        });

      /*
      // this code leaves it like blah#id(arg1=1, arg2=2) vs blah#id arg1=1 arg2=2
      var re = /_origname='(.*?)',? ?/;
      match = re.exec(attrs);
      console.log(match);
      attrs = attrs.replace(re, '').replace(/\(\)/, ''); // _origname
      attrs = attrs.replace(/\((.*?)\=''\)/, ' $1'); // data context single arg
      attrs = attrs.replace()
      return '+' + match[1] + attrs;
      */
    });
  jade = jade.replace(new RegExp('  meteor-else-' + u, 'g'), 'else');

  // Process tag variables
  jade = jade.replace(new RegExp('mdata-(\\w+)-' + u + '="(.*?)"', 'g'), '$1="$2"');
  jade = jade.replace(new RegExp('mdata-(\\w+)-' + u + '=\'(.*?)\'', 'g'), '$1="$2"');

  // Process dynamic attributes
  jade = jade.replace(new RegExp('mdyn-' + u + '=\'(.*?)\'', 'g'), '$dyn=$1');

  // Remove <html> tag: Meteor doesn't like it in templates
  //jade = jade.split('\n').slice(1).join('\n');
  //jade = jade.replace(/^  /gm, '');

  // Remove hanging spaces
  jade = jade.replace(/ *$/gm, '');

  // Decode entities (not sure why html2jade doesn't do it)
  jade = he.decode(jade);

  // Remove empty head (i.e. head followed by unindented line)
  jade = jade.replace(/^head\n\r?([^\t ]+)/, '$1');

  // Remvoe implied body
  // jade = jade.replace('')

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

/* And this is our only actual change  NOT TRUE ANYMORE TODO UDPATE */

spacebars2jade = function(html) {
  if (html === '') { return ''; }

  /*
  var lastHtml;
  while (lastHtml !== (html = preProcessHtml(html)))
    lastHtml = html;
  */
  html = preProcessHtml(html);

  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");
  var converter = new Html2Jade.Converter({
    // donotencode: true, // has no effect
    bodyless: true
  });
	var output = new Html2Jade.StringOutput();
	converter.document(doc, output);
	var jade = output.final();

	return postProcessJade(jade);
}
