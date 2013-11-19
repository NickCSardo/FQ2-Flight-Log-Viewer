function fetchAndParse(filenames, postLoad){
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

function parse(files, postParse){
    var q = queue();
    console.log('parsing');
    files.forEach(function(info) {
        q.defer(function(callback){
            var data = d3.csv.parse(info.string);
            callback(null, {name:info.name, values:data})
        });
    });

    q.awaitAll(postParse);
}

function loadLocal(files, postLoad){
    var q = queue();

    files.forEach(function(info) {
        q.defer(function(callback) {
            var fr = new FileReader();
            fr.onload = function(e) {
                callback(null, {name:info.name, string: e.target.result});
            };
            fr.readAsText(info.file);
        });
    });

    q.awaitAll(postLoad);
}



function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}
