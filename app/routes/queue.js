module.exports = function(app) {

    app.get('/queue/remove/:rowKey', function(req, res) {
        var update = {
            $set: {
                "retest.enabled": false
            }
        }
       
        db.collection("websites").update({ "rowKey": req.params.rowKey }, update, function(err, results) {
            if (err) res.status(400).json({"erros": "No data found for this rowKey"});
            console.log(req.params.rowKey + " removed from queue");
            res.format({
                html: function() {
                    res.end(req.params.rowKey + " removed from queue");
                },
                json: function() {
                    res.status(200).json({"data": req.params.rowKey + " removed from queue"});
                }
            });
        });
    });




    /* app.post('/tools/checktechnology', function (req, res) {
        const wappalyzer = require('wappalyzer');
        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        } 

        var done = false;

        console.log('URL Requested: '+ request.url); 
        wappalyzer.analyze(request.url)
        .then(json => {
            console.log('analyze done');
            done = true;
            res.status(200).json(json);
        })
        .catch(error => {
            console.error(error);
            res.status(400);
            res.set("Connection", "close");
            res.json(error);
        }); 

        setTimeout(() => {
            console.log(done);
            if (done == false) {
                res.status(400).json([]);
            }
        }, 10000);


    }); */
}