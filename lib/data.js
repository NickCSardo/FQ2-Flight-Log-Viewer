var flightLogs = ["flightLog_harvestedpaths_20130911_1824.csv" // ,"ss_open.csv"
   ];

var flightCosts = ["harvestedpaths_costs.csv" // ,"ss_open_costs.csv"
    ];

var commonFiles = ["us.json","TestFlights.csv", "airports-latlong.csv"];

function processFiles(rawFiles){
    var files = window.files = {};
    var maps = window.maps = {};
    rawFiles.forEach(function(file) {
        files[file.name] = file.values;
    });

    var flightsWithPaths = {}
    maps.flightLog = {}
    flightLogs.forEach(function(competitor){
        // Format log
        files[competitor] =
            _.map(files[competitor], function(d){
                return {
                    FlightId: +d.FlightId,
                    Location: projection([d.Longitude,d.Latitude]),
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

    // Format testFlights
    files["airports-latlong.csv"] =
        _.map(files["airports-latlong.csv"], function(d){
            return {
                Code: d.airport_icao_code, // convert "Year" column to Date
                Location: projection([d.longitude_degrees,d.latitude_degrees]),
                Altitude: d.altitude // convert "Length" column to number
            };
        });

    // Create map of airports off code
    maps.airports = _.reduce(files["airports-latlong.csv"], function(map, record){ map[record.Code] = record;  return map;}, {});
    console.log('processed airports');

    // Format testFlights
    files["TestFlights.csv"] =
        _.map(files["TestFlights.csv"], function(d){
            var destination = maps.airports[d.ArrivalAirport];
            var currentLocation = projection([d.CurrentLongitude,d.CurrentLatitude]);
            return {
                FlightId: +d.FlightHistoryId,
                Destination: d.ArrivalAirport,
                Location:  currentLocation,
                DistanceToDestination: distance(destination.Location, currentLocation),
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