module.exports = function(app) {

    var cors = require('cors');
    app.use(cors());
    
 

    app.get('/criticalcss', function(req, res) {
        var request = require('request');
        var path = require('path');
        var criticalcss = require("criticalcss");
        var fs = require('fs');
        var tmpDir = require('os').tmpdir();

         

        var cssUrl = 'https://sacher.com.mx/skin/frontend/smartwave/porto/css/configed/design_default.css';
        var cssPath = path.join(tmpDir, 'style.css');
        request(cssUrl).pipe(fs.createWriteStream(cssPath)).on('close', function() {
            criticalcss.getRules(cssPath, function(err, output) {
                if (err) {
                    throw new Error(err);
                    res.status(400).json(err);
                } else {
                    criticalcss.findCritical("https://sacher.com.mx/pasteles.html", { ignoreConsole: true, rules: JSON.parse(output) }, function(err, output) {
                        if (err) {
                            throw new Error(err);
                            res.status(400).json(err);
                        } else {
                            console.log(output);
                            res.status(200).json(output);
                        }
                    });
                }
            });
        });
    });
}