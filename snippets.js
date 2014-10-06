Session.setDefault('snippetLangs', {
	'javascript': 'javascript',
	'spacebars': 'spacebars'
});

var langGroups = {
	'javascript': ['coffeescript', 'javascript'],
	'spacebars': ['jade', 'spacebars']
};

Template.snippet.helpers({

	alternatives: function() {
		return langGroups[this.lang];
	},

	currentLang: function(currentLang) {
		if (currentLang) {
			var snippetLang = Template.parentData(1).lang;
			return Session.get('snippetLangs')[snippetLang] == currentLang;
		} else
			return Session.get('snippetLangs')[this.lang];
	},

	convert: new Template('convert', function() {
		var view = this;
    var content = '';
    if (view.templateContentBlock) {
      content = Blaze._toText(view.templateContentBlock, HTML.TEXTMODE.STRING);
    }

		var source = Template.parentData(1).lang;
		var dest = Session.get('snippetLangs')[source];

		// Support for famous-views
		if (typeof FView !== 'undefined')
		_.defer(function() {
			var fview = FView.from(view);
			if (fview.autoHeight)
				fview.autoHeight();
		});

    return HTML.Raw(convert(content, source, dest));
  })

});

Template.snippet.events({

	'click div.snippet > div > span': function(event, tpl) {
		var source = tpl.data.lang;
		var snippetLangs = Session.get('snippetLangs');
		var desired = $(event.target).attr('data-lang');
		snippetLangs[source] = desired;
		Session.set('snippetLangs', snippetLangs);
	},

	// When clicking anywhere, cycle through all the languages
	/*
	'click': function(event, tpl) {
		var source = tpl.data.lang;
		var snippetLangs = Session.get('snippetLangs');
		var current = snippetLangs[source];

		var index = langGroups[source].indexOf(current) + 1;
		if (index === langGroups[source].length) index = 0;

		snippetLangs[source] = langGroups[source][index];
		Session.set('snippetLangs', snippetLangs);
	}
	*/

});

// XXX put somewhere nice
js2coffee = require('js2coffee');

function convert(code, source, dest) {
	if (source == dest)
		return code;

	var mapping = source + ':' + dest;

	if (mappings[mapping])
		return mappings[mapping](code, source, dest);

	return "I don't know how to convert from " + source + ' to ' + dest;
}

var mappings = {
	'javascript:coffeescript': function(code) {
		var out = js2coffee.build(code);
		//out = out.replace(/\n[\t ]*([\w\.]+)[\t ]*\n/gm, ' $1');
		return out;
	},
	'spacebars:jade': function(code) {
		code = code.replace(/^\n*/, '');
		var indent = code.match(/^([\t ]*)/);
		code = code.replace(new RegExp('^' + indent[0], 'gm'), '');
		code = '// Apologies, Jade conversion is only partially done\n' + code;

		var len = 0;
		// {{#tag}}content{{/tag}}
		while (code.length != len) {
			len = code.length;
			code = code.replace(/\{\{#([^ ]+)(.*?)\}\}([^]*?)[\n\t ]*\{\{\/\1\}\}/gm,
				function(match, tag, attrs, content) {
					var out = '+' + tag + attrs;
					if (!/\n/.test(content)) out += ' ';
					else if (!/\{\{|\</.test(content))
						content = content.replace(/(\n[\t ])*\W/, '$1| ');
					out += content;
					return out;
				});
			code = code.replace(/^\n*/gm, '');
		}

		len = 0;
		// <tag>content</tag>
		while (code.length != len) {
			len = code.length;
			code = code.replace(/<([^ ]+) *(.*?)>([^]*?)<\/\1>/gm,
				function(match, tag, attrs, content) {
					var out = tag;
					if (attrs) out += '(' + attrs.replace(/ /, ', ') + ')';
					//if (content[0] != '\n') out += '\n' + tagIndent + '  ';
					if (!/\n/.test(content)) out += ' ';
					else if (!/^\n[\t ]*\+/.test(content)) content = content.replace(/(\n[\t ])*/, '$1| ');
					out += content;
					return out;
				});
		}

		// comments
		code = code.replace(/^([\t ]*)\{\{!-- (.*?) --\}\}/gm, '$1// $2');
		// inclusion
		code = code.replace(/\{\{>([^ ]+)(.*?)\}\}/gm, '+$1$2');
		// single tags
		code = code.replace(/<([^ ]+) *(.*?)>/gm, function(match, tag, attrs) {
			var out = tag;
			if (attrs) out += '(' + attrs.replace(/ /, ', ') + ')';
			//if (content[0] != '\n') out += '\n' + tagIndent + '  ';
			return out;			
		});
		// variables (TODO, escape variables in attributes before this)
		code = code.replace(/\{\{(.*?)\}\}/g, '#{$1}');

		/*
    var parser = new DOMParser();
    var doc = parser.parseFromString(code, "text/xml");
		var converter = new Html2Jade.Converter({});
		var output = new Html2Jade.StringOutput();
		converter.document(doc, output);
		var jade = output.final();
		*/

		return code;
	}
}
