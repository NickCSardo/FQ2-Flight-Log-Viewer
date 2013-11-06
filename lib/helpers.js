function load(filenames, postLoad){
    var q = queue();
    filenames.forEach(function(d) {
        q.defer(function(callback) {
            if(d.indexOf("csv") != -1){
                d3.csv(d, function(res) { callback(null, {name:d, values:res}) });
            } else if(d.indexOf("json") != -1){
                d3.json(d, function(res) { callback(null, {name:d, values:res}) });
            }
        });
    });

    q.awaitAll(postLoad)
}

function distance(coord0, coord1){
    var x = coord1[0] - coord0[0];
    var y = coord1[1] - coord0[1];
    return Math.sqrt(x*x + y*y);
}

function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}
