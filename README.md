## gadicohen:snippets

This is a work in progress for the
[famous-views website](http://famous-views.meteor.cmo/).

I wouldn't suggest using this yet but don't let me stop you :>

```handlebars
  	{{#snippet lang="spacebars"}}
  		&lt;template name="famousInit">
  			{{#Surface size="[undefined,undefined]"}}
  				I am a full size Surface
  			{{/Surface}}
  		&lt;/template>
  	{{else}}
  		{{!-- optional section to include by-hand conversions}}
  		{{#if currentLang "jade"}}
  			template(name="famousInit")
  			  +Surface size="[undefined,undefined]"
  			    | I am a full size Surface
  	{{/snippet}}
```
