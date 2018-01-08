let keys = [
    {
        "apiKey": "A.9c2b78eef60760c5712a194a938834e1"
    },{
        "apiKey": "A.32b1fc829847365ee9171d3decf2b973"
    },{
        "apiKey": "A.4e55375733ab32c1c41695a612a31d4e"
    }
];

var count = 0;
var indexKey = 0;
var counterKey = function() {
    count += 3;
    if (count == 199) {
        indexKey += 1;
        if (indexKey == keys.length) {
            indexKey = 0;    
        }
        count = 0;
        return keys[indexKey].apiKey;
    } else {
        return keys[indexKey].apiKey;
    }
}

module.exports = {
    keys,
    counterKey
}