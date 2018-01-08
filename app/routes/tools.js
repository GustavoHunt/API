module.exports = function (app) {
    var cors = require('cors');
    app.use(cors());
    keysAvaliable = require('../../config/wpt-api').keys;
    counterKey = require('../../config/wpt-api').counterKey;

    app.post('/tools/checktechnology', function (req, res) {
       const wappalyzer_app = require('wappalyzer/driver');
        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        var done = false;
        console.log('URL Requested: ' + request.url);

          const options = {
            debug: false,
            delay: 500,
            maxDepth: 3,
            maxUrls: 10,
            maxWait: 3000,
            recursive: true,
            userAgent: 'Wappalyzer',
          };
          
          const wappalyzer = new Wappalyzer('https://www.wappalyzer.com', options);
          
          wappalyzer.analyze()
            .then(json => {
              process.stdout.write(JSON.stringify(json, null, 2) + '\n')
          
              process.exit(0);
            })
            .catch(error => {
              process.stderr.write(error + '\n')
          
              process.exit(1);
          });


        /*     wappalyzer.analyze(request.url)
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
     */
        setTimeout(() => {
            console.log(done);
            if (done == false) {
                res.status(400).json([]);
            }
        }, 10000);
    });

    app.post('/psi/run', function (req, res) {
        const psi = require('psi');
        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        psi(request.url, { nokey: 'true', strategy: 'mobile' }).then(data => {
            var pageSpeedObject = data;
            res.status(200).json(pageSpeedObject);
        }).catch(function (err) {
            if (err) {
                console.log("Promise Rejected" + err);
                res.status(500).json(err);
            }
        });
    });

    app.post('/wpt/run', function (req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());
        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        wpt.runTest(request.url, { location: request.location, emulateMobile: true, runs: 3, firstViewOnly: true, connectivity: "3G" }, (err, data) => {
            if (err) {
                console.log(err);
                res.status(400).json(err);
                return;
            }

            if (data.statusCode == 200) {
                wpt.getTestStatus(data.data.testId, (err, data) => {
                    res.status(200).json(data);
                });
            } else {
                res.status(400).json(data);
            }
        });
    });

    app.post('/wpt/check', function (req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());
        var request = req.body;

        req.assert('testId', 'testId cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        wpt.getTestStatus(request.testId, (err, data) => {
            //console.log(err || data);
            if (data.statusCode == 200 && data.statusText == 'Test Complete') {
                wpt.getTestResults(request.testId, (err, data) => {
                    //console.log(err || data);
                    res.status(200).json(data);
                });
            } else {
                res.status(200).json(data);
            }
        });
    });


}