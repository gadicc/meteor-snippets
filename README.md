## gadicohen:snippets

This is a work in progress for the
[famous-views website](http://famous-views.meteor.com/).

I wouldn't suggest using this yet but don't let me stop you :>

```handlebars
  	{{#snippet lang="spacebars"}}
  		&lt;template name="famousInit">
  			{{#Surface size="[undefined,undefined]"}}
  				I am a full size Surface
  			{{/Surface}}
  		&lt;/template>
    {{/snippet}}
```

This will wrap your code with prism highlighting, add buttons for other languages in that
code group, and automatically convert your snippet into the target language.  Current code
groups are JavaScript/CoffeeScript and Spacebars/Jade.

Sometimes code looks much better by hand, so you can also include hand-crafted conversions
in the "else" section of your snippet block.

```handlebars
  	{{#snippet lang="spacebars"}}
  		&lt;template name="famousInit">
  			{{dstache}}#Surface size="[undefined,undefined]"}}
  				I am a full size Surface
  			{{dstache}}/Surface}}
  		&lt;/template>
  	{{else}}
  		{{!-- optional section to include by-hand conversions --}}
  		{{#if currentLang "jade"}}
  			template(name="famousInit")
  			  +Surface size="[undefined,undefined]"
  			    | I am a full size Surface
  		{{/if}}
  	{{/snippet}}
```

If the right language exists in the else block, it will be shown instead, otherwise
conversion happens like usual.

Note: If you're coding in spacebars, and want to give a spacebars example in spacebars,
you need to escape your moustache tags (like with a 'dstache' helper like the one used
in Meteor docs).
