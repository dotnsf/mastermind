//. app.js
var express = require( 'express' ),
    uuidv1 = require( 'uuid/v1' ),
    app = express();

app.use( express.static( __dirname + '/public' ) );

//. No Persistency
var gameids = {};

app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, message: "Try 'GET /api/init' to start master mind game." }, null, 2 ) );
  res.end();
});

app.get( '/api/ping', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true }, null, 2 ) );
  res.end();
});

app.get( '/api/init', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = uuidv1();
  var found = false;
  var length = ( req.query.length ? parseInt( req.query.length ) : 4 );
  do{
    if( getGame( id ) ){
      id = uuidv1();
    }else{
      setGame( id, { count: 0, length: length, value: generateDigit( length ), created: ( new Date() ).getTime() } );
      found = true;
    }
  }while( !found );

  res.write( JSON.stringify( { status: true, id: id, message: "Check your guess with 'GET /api/check?id=" + id + "&value=NNNN'" }, null, 2 ) );
  res.end();
});

app.get( '/api/check', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;
  var value = req.query.value;
  //console.log( id, value );

  if( !id || !value ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Both parameter id and value needed.' }, null, 2 ) );
    res.end();
  }else if( !getGame( id ) ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'No game information found for id "' + id + '".' }, null, 2 ) );
    res.end();
  }else if( !validateDigit( id, value ) ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Not valid format for value "' + value + '".' }, null, 2 ) );
    res.end();
  }else{
    var game = getGame( id );
    if( game.finished ){
      res.status( 400 )
      res.write( JSON.stringify( { status: false, error: 'Already finished.' }, null, 2 ) );
      res.end();
    }else{
      var result = checkAnswer( game, value );
      game.count ++;
      game.updated = ( new Date() ).getTime();
      setGame( id, game );

      var json = { status: true, id: id, length: game.length, value: value, hit: result[0], error: result[1] };
      if( result[0] == game.length ){
        game.finished = true;
        setGame( id, game );
        json.message = "Congrats!";
      }

      res.write( JSON.stringify( json, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/status', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var json = JSON.parse( JSON.stringify( gameids ) );
  Object.keys( json ).forEach( function( id ){
    if( json[id] && !json[id].finished ){
      json[id].value = "";
      for( var i = 0; i < json[id].length; i ++ ){
        json[id].value += "*";
      }
    }
  });
  res.write( JSON.stringify( { status: true, gameids: json }, null, 2 ) );
  res.end();
});

app.post( '/api/reset', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, message: "Not implemented yet." }, null, 2 ) );
  res.end();
});


function getGame( id ){
  return gameids[id];
}

function setGame( id, game ){
  gameids[id] = game;
  return true;
}

function generateDigit( n = 4 ){
  var s = '';
  for( var i = 0; i < n; i ++ ){
    var c = '' + Math.floor( Math.random() * 10 );
    if( s.indexOf( c ) > -1 ){
      i --;
    }else{
      s += c;
    }
  }

  return s;
}

function validateDigit( id, s ){
  var game = getGame( id );
  if( !game || !s || !( typeof s == 'string' ) || !( s.length == game.length ) ){
    return false;
  }else{
    try{
      var dummy = parseInt( s );
    }catch( e ){
      return false;
    }

    var arr1 = [];
    for( var i = 0; i < s.length; i ++ ){
      arr1.push( s.charAt( i ) );
    }
    var arr2 = Array.from( new Set( arr1 ) );
    return ( arr1.length == arr2.length );
  }
}

function checkAnswer( game, digits ){
  var h = 0;
  var e = 0;
  var answer = game.value;
  var length = game.length;
  for( var i = 0; i < length; i ++ ){
    var c = digits.charAt( i );
    if( answer.indexOf( c ) > -1 ){
      if( answer.indexOf( c ) == i ){
        h ++;
      }else{
        e ++;
      }
    }
  }

  return [ h , e ];
}

var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
