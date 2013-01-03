var util = require('util');
var XBee = require('svd-xbee').XBee;
var JParser = require('jParser');
var memoryDb = require('./memoryDb.js');
var _ = require('underscore');

var xbee = new XBee({
	port: '/dev/ttyUSB0',
	baudrate: 9600,
  config: {}
});

var packet_patterns = require('./sensorData');

module.exports.boot = function(emitter) {
	var handler = emitter;
  memoryDb.listSensors(function(sensorObj){
    _.forEach(sensorObj, function(s){
      console.log(s);
    });
  });
	xbee.on("configured", function(config) {
		console.log("XBee Config: %s", util.inspect(config));
	});

	xbee.on("node", function(node) {
	  handler.emit({id: node.remote64.hex, status: 'on', node: node});	
		
    node.on("data", function(data) {
			//Every packet that comes in should be parsed based on its sensor type.
      //sensor type is defined by the first byte of the array.
      //0x00 is a thermostat
      var type = data[0];
      console.log('sensor with type ' + type + ' sent data');
      if(packet_patterns[type]){
        var parser = new jParser(data, {pattern : packet_patterns[type].payloadPattern});
        var packet = parser.parse('pattern');
        console.log(packet); 
        handler.emit('sensor_reading', {
             sensorId: node.remote64.hex,
             payload:  packet
        }); 
      }else{
        console.log('unsupported sensor type');
      }
	});

  });
  xbee.on('error', function(err){
    console.log(err);
  });
  try{ 
	xbee.init(function(){
    console.log('created serial connection to xbee');
  });
  }catch(e){
    console.log(e, 'error initializing xbee cordinating... waiting..');
  }
}

