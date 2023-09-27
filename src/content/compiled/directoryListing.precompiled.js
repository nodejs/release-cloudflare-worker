import Handlebars from 'handlebars'; // NOTE: Handlebars didn't add this and Workers didn't like that
(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['directoryListing.hbs'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <tr>\r\n        <td><a href='"
    + alias4(((helper = (helper = lookupProperty(helpers,"href") || (depth0 != null ? lookupProperty(depth0,"href") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"href","hash":{},"data":data,"loc":{"start":{"line":20,"column":21},"end":{"line":20,"column":29}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":20,"column":31},"end":{"line":20,"column":39}}}) : helper)))
    + "</a></td>\r\n        <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"lastModified") || (depth0 != null ? lookupProperty(depth0,"lastModified") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"lastModified","hash":{},"data":data,"loc":{"start":{"line":21,"column":12},"end":{"line":21,"column":28}}}) : helper)))
    + "</td>\r\n        <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"size") || (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"size","hash":{},"data":data,"loc":{"start":{"line":22,"column":12},"end":{"line":22,"column":20}}}) : helper)))
    + "</td>\r\n      </tr>\r\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<html>\r\n<head>\r\n  <title>Index of "
    + alias4(((helper = (helper = lookupProperty(helpers,"pathname") || (depth0 != null ? lookupProperty(depth0,"pathname") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"pathname","hash":{},"data":data,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":30}}}) : helper)))
    + "</title>\r\n  <meta name='viewport' content='width=device-width, initial-scale=1.0' />\r\n  <meta charset='utf-8' />\r\n  <style type='text/css'>\r\n    td { padding-right: 16px; text-align: right; font-family: monospace }\r\n    td:nth-of-type(1) { text-align: left; overflow-wrap: anywhere }\r\n    td:nth-of-type(3) { white-space: nowrap } th { text-align: left; } @media\r\n    (prefers-color-scheme: dark) { body { color: white; background-color:\r\n    #1c1b22; } a { color: #3391ff; } a:visited { color: #C63B65; } }\r\n  </style>\r\n</head>\r\n<body>\r\n  <h1>Index of "
    + alias4(((helper = (helper = lookupProperty(helpers,"pathname") || (depth0 != null ? lookupProperty(depth0,"pathname") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"pathname","hash":{},"data":data,"loc":{"start":{"line":15,"column":15},"end":{"line":15,"column":27}}}) : helper)))
    + "</h1>\r\n  <table>\r\n    <tr><th>Filename</th><th>Modified</th><th>Size</th></tr>\r\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"entries") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":18,"column":4},"end":{"line":24,"column":13}}})) != null ? stack1 : "")
    + "  </table>\r\n</body>\r\n</html>\r\n";
},"useData":true});
})();