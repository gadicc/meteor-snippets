Session.setDefault('snippetLangs', {
	'javascript': 'javascript',
	'spacebars': 'spacebars'
});

var langGroups = {
	'javascript': ['coffee', 'javascript'],
	'spacebars': ['jade', 'spacebars']
};

var langAliases = {
	'coffeescript': 'coffee'
};
var L = function(lang) {
	return langAliases[lang] || lang;
}

function currentLang(currentLang) {
	if (currentLang) {
		var snippetLang = L(Template.parentData(1).lang);
		return Session.get('snippetLangs')[snippetLang] == L(currentLang);
	} else
		return Session.get('snippetLangs')[L(this.lang)];
}

Blaze.registerHelper('currentLang', currentLang);

Template.snippet.helpers({

	alternatives: function() {
		return langGroups[L(this.lang)];
	},

	currentLang: currentLang,

	code: new Template('code', function() {
		// Template.snippet
		var view = this.parentView.parentView.parentView.parentView;
    var content = '';
    var runConvert = false;

//    console.log(view);

/*
    if (view.templateElseBlock) {
			view.templateElseBlock.helpers({currentLang:currentLang});
			view.templateElseBlock.__helpers.set('currentLang', currentLang);
  		console.log(view.templateElseBlock);
    	var block = view.templateElseBlock.constructView();
    	console.log(block);
    	//console.log(Blaze._getTemplateHelper(block.template, 'currentLang'));
    	//console.log(Blaze.View.prototype.lookup.call(block, 'currentLang')());

//console.log(Blaze._toText(view.templateElseBlock, HTML.TEXTMODE.STRING));
block2 = new Template('(elseBlock)', function() {
	return block;
});
console.log(Blaze._toText(block2, HTML.TEXTMODE.STRING));
    		
//    		return view.templateElseBlock;
 //   	}
    }
*/

    if (view.templateElseBlock) {
    	content = Blaze._toText(view.templateElseBlock, HTML.TEXTMODE.STRING);
    }

    if (!/\S+/.test(content) && view.templateContentBlock) {
			var source = Template.parentData(1).lang;
			var dest = Session.get('snippetLangs')[source];
    	runConvert = true;
      content = Blaze._toText(view.templateContentBlock, HTML.TEXTMODE.STRING);
    }

    // Remove initial newlines and initial indent
		content = content.replace(/^\n*/, '');
		var initialIndent = content.match(/^([\t ]*)/);
		content = content.replace(new RegExp('^' + initialIndent[0], 'gm'), '');


		// Support for famous-views
		if (typeof FView !== 'undefined')
		_.defer(function() {
			var fview = FView.from(view);
			if (fview.autoHeight)
				fview.autoHeight();
		});

    return HTML.Raw(runConvert ? convert(content, source, dest) : content);
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

function convert(code, source, dest, returnNull) {
	source = L(source);
	dest = L(dest);

	if (source == dest)
		return code;

	var mapping = source + ':' + dest;

	if (mappings[mapping])
		return mappings[mapping](code, source, dest);

	if (returnNull)
		return null;

	return "I don't know how to convert from " + source + ' to ' + dest;
}

var mappings = {
	'javascript:coffee': function(code) {
		var out = js2coffee.build(code);
		//out = out.replace(/\n[\t ]*([\w\.]+)[\t ]*\n/gm, ' $1');
		return out;
	},
	//'spacebars:jade': spacebars2jade,
	'spacebars:jade': function(code) {
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
};

var hasMapping = function(source, dest) {
	return !!mappings[L(source)+':'+L(dest)];
};

/* Exports */

snippets = {
	convert: convert,
	mappings: mappings,
	hasMapping: hasMapping
};