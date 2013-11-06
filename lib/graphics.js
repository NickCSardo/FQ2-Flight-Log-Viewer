var width = 900,
    height = 500;

var projection = d3.geo.conicConformal()
    .rotate([98,0])
    .center([0, 38])
    .parallels([25.0,25.0])
    .scale(1100)
    .translate([width / 2, height / 2])
    .precision(0.00001);

var path = d3.geo.path()
    .projection(projection);

var line = d3.svg.line()
    .x(function(d) { return d.Location[0]; })
    .y(function(d) { return d.Location[1]; })
    .interpolate("linear");

function zoomed() {
    projection.translate(d3.event.translate).scale(d3.event.scale);
    g.selectAll().attr("d", path);
}

var zoom = d3.behavior.zoom()
    .translate(projection.translate())
    .scale(projection.scale())
    .scaleExtent([height, 8 * height])
    .on("zoom", zoomed);

var graticule = d3.geo.graticule()
    .extent([[-98 - 45, 38 - 45], [-98 + 45, 38 + 45]])
    .step([5, 5]);