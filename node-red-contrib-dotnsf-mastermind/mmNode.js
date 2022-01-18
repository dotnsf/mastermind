module.exports = function( RED ){
  function mmNode( config ){
    RED.nodes.createNode( this, config );
    var node = this;
    node.on( 'input', function( msg ){
      //. check
      msg.payload = msg.payload + "Hello.";
      node.send( msg );
    });
  }
  RED.nodes.registerType( "Master Mind", mmNode );
}

