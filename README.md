
graphly
======

graphly is a library for helping plot 1D data as interactive graph with
multitude of configuration options for rendering. Additionally it allows 
integrating 2D data which can be rendered in the background


Installation
------------

Installation with Bower:
```bash
bower install --save eox-a/graphly
```

Installation with npm:
```bash
npm install graphly --save
```
Docs
----
http://eox-a.github.io/graphly/

Usage
-----

Just include script to site and add a canvas element where you want to render the data.
```html
<head>
	<script src="dist/graphly.min.js"></script>
</head>
<body>
	<div id="graph"></div>
</body>
```

and render using predefined settings:
```javascript
var graph = new plotty.graph({

});

```