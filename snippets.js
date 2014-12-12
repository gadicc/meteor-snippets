Session.setDefault('snippetLangs', {
	'javascript': 'javascript',
	'spacebars': 'spacebars'
});

var langGroups = {
	'javascript': ['coffee', 'javascript'],
	'spacebars': ['jade', 'spacebars']
};

var langAliases = {
	'coffeescript': 'coffee',
	'js': 'javascript'
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
		if (typeof FView !== 'undefined') {
			var fview = FView.from(view);
			var surface = fview && fview.surface;
			if (surface && surface.size && surface.size.length &&
					(surface.size[0] === true || surface.size[1] === true))
				Tracker.afterFlush(function() {
					fview.surface._contentDirty = true;
				});
		}

		// TODO, should also check if our scroll position changed for good UI

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
	'javascript:coffee': js2coffee.build,
	'spacebars:jade': spacebars2jade,
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