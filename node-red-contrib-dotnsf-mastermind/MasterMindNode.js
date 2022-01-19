module.exports = function( RED ){
  var request = require( 'request' );
  function MasterMindNode( config ){
    RED.nodes.createNode( this, config );
    var node = this;
    this.name = config.name || '';
    this.type = config.type || 'guess';
    this.value = config.value || '';
    node.on( 'input', function( msg, send, done ){
      //. check
      msg.payload = msg.payload.toLowerCase();
      node.send( msg );
    });
  }
  RED.nodes.registerType( "MasterMind", MasterMindNode );
}

