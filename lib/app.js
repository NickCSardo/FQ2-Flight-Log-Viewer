var commonFiles = ["RestrictedZones.csv","airports-latlong.csv","TestFlights.csv"];

var flightLogs = ["flightLog_subAllesandro_20130913_1611.csv","flightLog_subChristian_20130913_1611.csv","flightLog_subTaki_20130913_1611.csv",
];
var flightCosts = ["subAllesandro_costs.csv","subChristian_costs.csv","subTaki_costs.csv",
];


var shownMapItems = [];

function initiateLoad(){
    var allFiles = commonFiles.concat.apply(commonFiles, flightLogs);
    allFiles = allFiles.concat.apply(allFiles, flightCosts);
    load(allFiles, postLoad);
}

function postLoad(error, rawFiles){
    var p = processFiles(rawFiles);

    // Restricted Zones
    _.forEach(p.files["RestrictedZones.csv"], function(zone){
        addZone(zone, map, "#FF0000");
    });

    // Airports
    _.forEach(p.files["airports-latlong.csv"], function(airport){
        addAirport(airport, map);
    });

    // Flight List
    setupFlightList(p.files, p.flightPathsExist, p.maps);
}

function setupFlightList(files, flightsWithPaths, maps){
    var oneDayFlights = _.filter(files["TestFlights.csv"], function(f){ return f.FlightId in flightsWithPaths; });
    var sortedFlights = _.sortBy(oneDayFlights, function(f){ return 1/f.DistanceToDestination; });
    var template = $("#flightListTemplate").html();
    var table = _.template(template, { 'flights': sortedFlights });
    $("#flights").html(table);

    // Handle table clicks
    $('#flights tr').click(function(event) {
        $('#flights tr').not(this).removeClass('selectedRow');
        $(this).toggleClass('selectedRow');

        var flightId = parseInt(($(this).children().first().html()));
        showFlight(flightId, maps);
    });
}

function processFiles(rawFiles){
    var files = window.files = {};
    var maps = window.maps = {};
    rawFiles.forEach(function(file) {
        files[file.name] = file.values;
    });

    files["RestrictedZones.csv"] =
        _.map(files["RestrictedZones.csv"], function(d){
            return {
                Code: d.Name,
                LowerBound: +d.LowerBound,
                UpperBound: +d.UpperBound,
                LatLongVertices: d.LatLongVertices.split(" "),
                LambertVertices: d.LambertVertices.split(" ")
            };
        });


    // Format testFlights
    files["airports-latlong.csv"] =
        _.map(files["airports-latlong.csv"], function(d){
            var location = new google.maps.LatLng(+d.latitude_degrees, +d.longitude_degrees);
            return {
                Code: d.airport_icao_code,
                Location: location,
                Altitude: +d.altitude
            };
        });

    var flightsWithPaths = {}
    maps.flightLog = {}
    flightLogs.forEach(function(competitor){
        // Format log
        files[competitor] =
            _.map(files[competitor], function(d){
                return {
                    FlightId: +d.FlightId,
                    Location: new google.maps.LatLng(+d.Latitude, +d.Longitude),
                    ElapsedTime: +d.ElapsedTime,
                    AirSpeed: +d.AirSpeed,
                    GroundSpeed: +d.GroundSpeed,
                    Altitude: +d.Altitude,
                    FuelConsumed: +d.FuelConsumed,
                    Weight: +d.Weight,
                    Status: d.Status
                };
            });

        maps.flightLog[competitor] = _.groupBy(files[competitor], function(record){ return record.FlightId; }, this);

        // Mark as existing
        for(var key in maps.flightLog[competitor]){
            flightsWithPaths[key] = true;
        }

        console.log('processed ' + competitor);
    });

    // Flight Costs
    maps.costs = {}
    flightCosts.forEach(function(costFile){
        files[costFile] =
            _.map(files[costFile], function(d){
                return {
                    Competitor: costFile,
                    FlightId: +d.FlightId,
                    DelayCost: +d.DelayCost,
                    FuelCost: +d.FuelCost,
                    TurbulenceCost: +d.TurbulenceCost,
                    OscillationCost: +d.OscillationCost,
                    TotalCost: (+d.FuelCost + (+d.DelayCost) + (+d.TurbulenceCost) + (+d.OscillationCost))
                    //ElapsedTime: +d.ElapsedTime
                };
            });

        maps.costs[costFile] = {}
        files[costFile].forEach(function(flight){
            maps.costs[costFile][flight.FlightId] = flight;
        })
        console.log('processed ' + costFile);
    });


    // Create map of airports off code
    maps.airports = _.reduce(files["airports-latlong.csv"], function(map, record){ map[record.Code] = record;  return map;}, {});
    console.log('processed airports');

    // Format testFlights
    files["TestFlights.csv"] =
        _.map(files["TestFlights.csv"], function(d){
            var destination = maps.airports[d.ArrivalAirport];
            var cutoffLocation = new google.maps.LatLng(+d.CurrentLatitude, +d.CurrentLongitude);
            return {
                FlightId: +d.FlightHistoryId,
                Destination: d.ArrivalAirport,
                Location:  cutoffLocation,
                DistanceToDestination: google.maps.geometry.spherical.computeDistanceBetween(destination.Location, cutoffLocation),
                ScheduledArrivalTime: new Date(Date.parse(d.ScheduledArrivalTime)),
                Altitude: +d.CurrentAltitude,
                StandardPassengerCount: +d.StandardPassengerCount,
                PremiumPassengerCount: +d.PremiumPassengerCount,
                FuelCost: +d.FuelCost,
                CrewDelayCost: +d.CrewDelayCost,
                OtherHourlyCosts: +d.OtherHourlyCosts
            };
        });
    maps.flights = _.reduce(files["TestFlights.csv"], function(map, record){ map[record.FlightId] = record;  return map;}, {});
    console.log('processed flights');

    return {
        files: files,
        flightPathsExist: flightsWithPaths,
        maps: maps
    }
}

function addZone(zone, map, color){
    var coords = _.map(zone.LatLongVertices, function(vert){
       var coord = vert.split(":");
       return new google.maps.LatLng(+coord[0],+coord[1])
    });

    var zPolygon = new google.maps.Polygon({
        paths: coords,
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: 0.35
    });

    zPolygon.setMap(map);
}

function addAirport(airport, map){
    var airportMarker = new google.maps.Marker({
        icon: 'images/control_tower-small.png',
        position: airport.Location,
        map: map,
        title:airport.Code
    });
}


function showFlight(flightId, maps){
    // Clear map
    while(shownMapItems.length > 0){
        var item = shownMapItems.pop();
        item.setMap(null);
    }

    assert(flightId && flightId > 0, "Need a flightId")

    var colors = d3.scale.category20();
    var compFlights = [];
    flightLogs.forEach(function(competitorLog,i){
        compFlights.push({
            file: competitorLog,
            color: colors(i),
            path: window.maps.flightLog[competitorLog][flightId] });
    });

    var costs = _.map(flightCosts, function(costFile, i){
        var flightCosts = maps.costs[costFile][flightId];
        flightCosts.color = colors(i);
        return flightCosts;
    });

    var flight = {
        id: flightId,
        record: window.maps.flights[flightId],
        paths: compFlights,
        costs: costs
    };

    if(!flight.record){
        alert('No flight record found');
        return;
    }
    if(flight.paths.length === 0){
        alert('No flight path found');
        return;
    }

    // Populate competitors table
    var template = $("#comparisonListTemplate").html();
    var sortedCompetitors = _.sortBy(costs, function(f){ return f.TotalCost; });
    var table = _.template(template, { 'costs': sortedCompetitors });
    $("#logComparison").html(table);

    flight.paths.forEach(function(flight){
        var flightPath = new google.maps.Polyline({
            map: map,
            path: _.map(flight.path, function(loc){return loc.Location;}),
            geodesic: true,
            strokeColor: flight.color,
            strokeOpacity: 1.0,
            strokeWeight: 3
        });

        shownMapItems.push(flightPath);
    });

    zoomToObject(shownMapItems[shownMapItems.length -1]);

    var startMarker = new google.maps.Circle({
        fillColor: "#66FF33",
        strokeColor: "#66FF33",
        fillOpacity: 1.0,
        strokeWeight: 3.0,
        radius: 10000.0,
        center: flight.record.Location,
        map: map
    });
    shownMapItems.push(startMarker);

    drawAttributeChart("altitude", "Altitude (ft)", 42000, compFlights, function(d){return d.Altitude;});
    drawAttributeChart("airspeed", "Air Speed (knots)", 500, compFlights, function(d){return d.AirSpeed;});
    drawAttributeChart("groundspeed", "Ground Speed (knots)", 500, compFlights, function(d){return d.GroundSpeed;});
    drawAttributeChart("fuel", "Fuel Consumed (pounds)", -1, compFlights, function(d){return d.FuelConsumed;});
//    drawAttributeChart("weight", "Weight (pounds)", 50000, compFlights, function(d){return d.Weight;});
    $('#graphs').show();
    $('#logComparison').show();

}

function deltaPercent(newValue, oldValue){
    var diff = newValue  - oldValue;
    return diff / Math.abs(oldValue) * 100.0;
}

function drawAttributeChart(divId, attributeName, maxY, flights, selector){
    $("#" + divId).find('svg').first().empty();
    var chart;

    var data = _.map(flights, function(f,i){
        var start = f.path[0].ElapsedTime;
        var records = _.map(f.path, function(r,i){
            return {
                x: (r.ElapsedTime - start),
                y: selector(r)
            }
        });
        return {
            values: records,
            key: f.file
        };
    });

    nv.addGraph(function() {
        chart = nv.models.lineChart()
            .margin({top: 15, right: 0, bottom: 30, left: 80})
        chart.width(410);
        chart.height(195);

        if(maxY > 0){
            chart.forceY([0,maxY])
        }

        chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
            .axisLabel('Hours Since Cutoff')
            .tickFormat(d3.format(',.1f'));

        chart.yAxis
            .axisLabel(attributeName)
            .tickFormat(d3.format(',.2f'));

        chart.showXAxis(true);
        chart.showYAxis(true);
        chart.showLegend(false);

        var loc = '#'+divId+' svg';
        d3.select(loc).selectAll().remove();
        d3.select(loc)
            .datum(data)
            .transition()
            .call(chart);

        chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });

        return chart;
    });
}

function zoomToObject(obj, offsetLong){
    var bounds = new google.maps.LatLngBounds();
    var points = obj.getPath().getArray();
    for (var n = 0; n < points.length ; n++){
        bounds.extend(points[n]);
    }
    map.fitBounds(bounds);
}