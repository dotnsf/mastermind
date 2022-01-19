//. app.js
var express = require( 'express' ),
    uuidv1 = require( 'uuid/v1' ),
    app = express();

app.use( express.static( __dirname + '/public' ) );

//. #5
var settings_admin_password = 'ADMIN_PASSWORD' in process.env ? process.env.ADMIN_PASSWORD : ''; 
//. #6
var settings_cors = 'CORS' in process.env ? process.env.CORS : '';

//. No Persistency
var gameids = {};

//. #6
app.all( '/*', function( req, res, next ){
  if( settings_cors ){
    res.setHeader( 'Access-Control-Allow-Origin', settings_cors );
    res.setHeader( 'Vary', 'Origin' );
  }
  next();
});

app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true, message: "Try 'GET /doc' for online API document." }, null, 2 ) );
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
  var length = 4;
  var highlow = false;

  //. #3, #4 ユーザー情報を格納する場合はここ
  var info = req.query;

  if( req.query.length ){
    var l = req.query.length;
    if( typeof l == "string" ){
      try{
        l = parseInt( l );
        if( l ){ length = l; }
      }catch( e ){
      }
    }
  }
  if( req.query.highlow ){
    var h = req.query.highlow;
    if( typeof h == "string" ){
      try{
        h = parseInt( h );
        if( h ){ highlow = true; }
      }catch( e ){
      }
    }
  }

  if( length > 9 || length < 2 ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Parameter length should be more than 1 and less than 10.' }, null, 2 ) );
    res.end();
  }else{
    do{
      if( getGame( id ) ){
        id = uuidv1();
      }else{
        setGame( id, { count: 0, highlow: highlow, length: length, value: generateDigit( length ), histories: [], info: info, created: ( new Date() ).getTime() } );
        found = true;
      }
    }while( !found );

    res.write( JSON.stringify( { status: true, id: id, highlow: highlow, length: length, message: "Check your guess with 'GET /api/guess?id=" + id + "&value=NNNN'" }, null, 2 ) );
    res.end();
  }
});

app.get( '/api/guess', function( req, res ){
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
    if( game.solved ){
      res.status( 400 )
      res.write( JSON.stringify( { status: false, error: 'Already solved.' }, null, 2 ) );
      res.end();
    }else if( game.giveup ){
      res.status( 400 )
      res.write( JSON.stringify( { status: false, error: 'Already gave up.' }, null, 2 ) );
      res.end();
    }else{
      var result = checkAnswer( game, value );
      game.count ++;
      game.updated = ( new Date() ).getTime();

      var history = { value: value, timestamp: game.updated, hit: result[0], error: result[1] };

      var json = { status: true, id: id, length: game.length, value: value, hit: result[0], error: result[1] };
      if( game.highlow ){
        if( game.value > value ){
          json.highlow = 'low';
          history.highlow = 'low';
        }else if( game.value < value ){
          json.highlow = 'high';
          history.highlow = 'high';
        }else{
          json.highlow = 'equal';
          history.highlow = 'equal';
        }
      }

      if( result[0] == game.length ){
        game.solved = true;
        json.message = "Congrats!";
      }

      game.histories.push( history );
      setGame( id, game );

      res.write( JSON.stringify( json, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/giveup', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;

  if( !id ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Parameter id needed.' }, null, 2 ) );
    res.end();
  }else{
    var game = getGame( id );
    if( game.solved ){
      res.status( 400 )
      res.write( JSON.stringify( { status: false, error: 'Already solved.' }, null, 2 ) );
      res.end();
    }else{
      game.giveup = true;
      setGame( id, game );

      res.write( JSON.stringify( game, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/status', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var json = JSON.parse( JSON.stringify( gameids ) );

  var id = req.query.id;
  if( !id ){
    var password = req.query.password;
    if( password && password == settings_admin_password ){
      res.write( JSON.stringify( { status: true, games: json }, null, 2 ) );
      res.end();
    }else{
      res.status( 403 )
      res.write( JSON.stringify( { status: false, error: 'Not allowed.' }, null, 2 ) );
      res.end();
    }
  }else{
    if( json[id] ){
      if( !json[id].solved && !json[id].giveup ){
        json[id].value = "";
        for( var i = 0; i < json[id].length; i ++ ){
          json[id].value += "*";
        }
      }
      res.write( JSON.stringify( { status: true, game: json[id] }, null, 2 ) );
      res.end();
    }else{
      res.status( 404 )
      res.write( JSON.stringify( { status: false, error: 'Not found.' }, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/reset', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var password = req.query.password;
  if( password && password == settings_admin_password ){
    resetGame();
    res.write( JSON.stringify( { status: true }, null, 2 ) );
    res.end();
  }else{
    res.status( 403 )
    res.write( JSON.stringify( { status: false, error: 'Not allowed.' }, null, 2 ) );
    res.end();
  }
});


function getGame( id ){
  return gameids[id];
}

function setGame( id, game ){
  gameids[id] = game;
  return true;
}

function resetGame(){
  gameids = {};
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
