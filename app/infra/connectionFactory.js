var MongoClient = require( 'mongodb' ).MongoClient;
var _db;

module.exports =  {
  connectToServer: function( callback ) {
    MongoClient.connect( "mongodb://msite_dev:JebetaisborUme7@ds147872.mlab.com:47872/msite", function( err, db ) {
      _db = db;
      return callback( err );
    } );
  },
  getDb: function() {
    return _db;
  }
};