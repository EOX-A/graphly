
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

Just include script to site and add a div element where you want to render the data.
You can also use the filtermanager with it by providing another div where the filters
panel should be managed.
The d3 dependency is not included in the build, so you will also need to include it.
```html
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.3/d3.min.js"></script>
    <script src="dist/graphly.min.js"></script>
</head>
<body>
    <div id="graph"></div>
    <div id="filters"></div>
</body>
```

and render using predefined settings:
```javascript
var filterManager = new FilterManager({
    el:'#filters',
    filterSettings: {
        visibleFilters: ['parameter1', 'parameter2']
    },
});
var graph = new graphly.graphly({
    el: '#graph',
    renderSettings: {
        xAxis: 'parameter1',
        yAxis: ['parameter2', 'parameter3'],
        y2Axis: ['parameter4']
    },
    filterManager: filterManager
});

graph.loadData({
    parameter1: [1, 2, 3, 4],
    parameter2: [0.1, 0.2, 0.3, 0.4],
    parameter3: [0.4, 0.3, 0.2, 0.1],
    parameter4: [150, 100, 120, 130]
});

```