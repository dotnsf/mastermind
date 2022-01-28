//. app.js
var express = require( 'express' ),
    uuidv1 = require( 'uuid/v1' ),
    app = express();

//. #13
var ejs = require( 'ejs' );
app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

//. #14
var { createCanvas } = require( 'canvas' );

var settings = require( './settings' );

app.use( express.static( __dirname + '/public' ) );

//. #5
var settings_admin_password = 'ADMIN_PASSWORD' in process.env ? process.env.ADMIN_PASSWORD : ''; 
//. #6
var settings_cors = 'CORS' in process.env ? process.env.CORS : '';

//. No Persistency
var gameids = {};

//. #3
var client = null;
var db_service_name = 'CLOUDANT';
var settings_db_url = 'DB_URL' in process.env ? process.env.DB_URL : settings.db_url;
var settings_db_apikey = 'DB_APIKEY' in process.env ? process.env.DB_APIKEY : settings.db_apikey;
var settings_db_name = 'DB_NAME' in process.env ? process.env.DB_NAME : settings.db_name;

//. env values
process.env[db_service_name + '_AUTH_TYPE'] = 'IAM';
if( !process.env[db_service_name + '_URL'] ){
  process.env[db_service_name + '_URL'] = settings_db_url;
}
if( !process.env[db_service_name + '_APIKEY'] ){
  process.env[db_service_name + '_APIKEY'] = settings_db_apikey;
}

//. DB
var { CloudantV1 } = require( '@ibm-cloud/cloudant' );

//. 環境変数 CLOUDANT_AUTH_TYPE を見て接続する
var client = null;
if( settings_db_apikey && settings_db_url && settings_db_name ){
  client = CloudantV1.newInstance( { serviceName: db_service_name, disableSslVerification: true } );
  client.putDatabase({
    db: settings_db_name
  }).catch( function( err ){
    //console.log( err );
  });
}

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

app.get( '/api/init', async function( req, res ){
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
      if( await getGame( id ) ){
        id = uuidv1();
      }else{
        await setGame( id, { count: 0, highlow: highlow, length: length, value: generateDigit( length ), histories: [], info: info, created: ( new Date() ).getTime() } );
        found = true;
      }
    }while( !found );

    var NNNN = '';
    for( var i = 0; i < length; i ++ ){
      NNNN += 'N';
    }

    res.write( JSON.stringify( { status: true, id: id, highlow: highlow, length: length, message: "Check your guess with 'GET /api/guess?id=" + id + "&value=" + NNNN + "'" }, null, 2 ) );
    res.end();
  }
});

app.get( '/api/guess', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;
  var value = req.query.value;
  //console.log( id, value );

  if( !id || !value ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Both parameter id and value needed.' }, null, 2 ) );
    res.end();
  }else if( !( await getGame( id ) ) ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'No game information found for id "' + id + '".' }, null, 2 ) );
    res.end();
  }else if( !validateDigit( id, value ) ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Not valid format for value "' + value + '".' }, null, 2 ) );
    res.end();
  }else{
    var game = await getGame( id );
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
      await setGame( id, game );

      res.write( JSON.stringify( json, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/giveup', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;

  if( !id ){
    res.status( 400 )
    res.write( JSON.stringify( { status: false, error: 'Parameter id needed.' }, null, 2 ) );
    res.end();
  }else{
    var game = await getGame( id );
    if( game.solved ){
      res.status( 400 )
      res.write( JSON.stringify( { status: false, error: 'Already solved.' }, null, 2 ) );
      res.end();
    }else{
      game.giveup = true;
      await setGame( id, game );

      res.write( JSON.stringify( game, null, 2 ) );
      res.end();
    }
  }
});

app.get( '/api/status', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var json = await getGames();

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

app.get( '/api/reset', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var password = req.query.password;
  if( password && password == settings_admin_password ){
    await resetGame();
    res.write( JSON.stringify( { status: true }, null, 2 ) );
    res.end();
  }else{
    res.status( 403 )
    res.write( JSON.stringify( { status: false, error: 'Not allowed.' }, null, 2 ) );
    res.end();
  }
});

//. #13
app.get( '/api/share', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;

  if( id ){
    var json = await getGames();
    if( json[id] ){
      if( !json[id].solved && !json[id].giveup ){
        res.status( 404 )
        res.write( JSON.stringify( { status: false, error: 'Game is not solved/given-up yet.' }, null, 2 ) );
        res.end();
      }else{
        //. シェア
        res.contentType( 'text/html; charset=utf-8' );
        res.render( 'share', { id: id, game: json[id] } );
      }
    }else{
      res.status( 404 )
      res.write( JSON.stringify( { status: false, error: 'Not found.' }, null, 2 ) );
      res.end();
    }
  }else{
    res.status( 404 )
    res.write( JSON.stringify( { status: false, error: 'No id specified.' }, null, 2 ) );
    res.end();
  }
});

//. #14
app.get( '/api/image', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.query.id;

  if( id ){
    var json = await getGames();
    if( json[id] ){
      if( !json[id].solved && !json[id].giveup ){
        res.status( 404 )
        res.write( JSON.stringify( { status: false, error: 'Game is not solved/given-up yet.' }, null, 2 ) );
        res.end();
      }else{
        var length = json[id].length;
        var value = json[id].value;
        var highlow = json[id].highlow;
        var histories = json[id].histories;
        var updated = timestamp2datetime( parseInt( json[id].updated ) );
        var name = ( json[id].info.name ? json[id].info.name : '(noname)' );
        var result = ( json[id].solved ? 'Solved' : 'Gave up' );
        
        //. 画像化
        res.contentType( 'image/png' );
        var canvas = createCanvas( 300, 10 + 50 + 60 + 30 * histories.length + 30 + 30 + 10 );
        var ctx = canvas.getContext( '2d' );

        ctx.font = '30px';
        ctx.fillText( value + ' ...' + result, 100, 50 );

        ctx.fillText( 'Length:' + length, 100, 90 );
        ctx.fillText( 'High-Low:' + highlow, 100, 120 );

        for( var i = 0; i < histories.length; i ++ ){
          var text = histories[i].value + ' -> ' + histories[i].hit + 'H ' + histories[i].error + 'E';
          ctx.fillText( text, 100, 150 + 30 * i );
        }

        ctx.fillText( result + ' by ' + name + ' on ' + updated + '.', 100, 150 + 30 * histories.length );
        ctx.fillText( 'MasterMind REST API', 100, 180 + 30 * histories.length );

        /*
        ctx.beginPath();
        ctx.moveTo( 100, 100 );
        ctx.lineTo( 200, 200 );
        */
        ctx.strokeStyle = 'black';
        ctx.stroke();

        var b64 = canvas.toDataURL().split( ',' )[1];
        var buf = new Buffer.from( b64, 'base64' );

        res.header( { 'Content-Disposition': 'inline' } );
        res.end( buf, 'binary' );
      }
    }else{
      res.status( 404 )
      res.write( JSON.stringify( { status: false, error: 'Not found.' }, null, 2 ) );
      res.end();
    }
  }else{
    res.status( 404 )
    res.write( JSON.stringify( { status: false, error: 'No id specified.' }, null, 2 ) );
    res.end();
  }
});


async function getGame( id ){
  return new Promise( ( resolve, reject ) => {
    if( client ){
      client.getDocument( { db: settings_db_name, docId: id, includeDocs: true } ).then( function( result ){
        resolve( result.result );
      }).catch( function( err ){
        //console.log( err );
        resolve( null );
      });
    }else{
      resolve( gameids[id] );
    }
  });
}

async function getGames(){
  return new Promise( ( resolve, reject ) => {
    if( client ){
      client.postAllDocs( { db: settings_db_name, includeDocs: true } ).then( function( result ){
        if( result && result.result && result.result.rows ){
          var games = {};
          result.result.rows.forEach( function( row ){
            games[row.doc._id] = row.doc;
          });
          resolve( games );
        }else{
          resolve( null );
        }
      }).catch( function( err ){
        console.log( err );
        resolve( null );
      });
    }else{
      var json = JSON.parse( JSON.stringify( gameids ) );
      resolve( json );
    }
  });
}

async function setGame( id, game ){
  return new Promise( ( resolve, reject ) => {
    if( client ){
      game._id = id;
      client.postDocument( { db: settings_db_name, document: game } ).then( function( result ){
        resolve( result.result );
      }).catch( function( err ){
        console.log( err );
        resolve( null );
      });
    }else{
      gameids[id] = game;
    }
    resolve( true );
  });
}

async function resetGame(){
  return new Promise( ( resolve, reject ) => {
    if( client ){
      client.postAllDocs( { db: settings_db_name } ).then( function( result ){
        if( result && result.result && result.result.rows ){
          var docs = [];
          result.result.rows.forEach( function( row ){
            docs.push( { _id: row.id, _rev: row.value.rev, _deleted: true } );
          });
          client.postBulkDocs( { db: settings_db_name, bulkDocs: { docs: docs } } ).then( function( result ){
            resolve( true );
          }).catch( function( err ){
            console.log( err );
            resolve( null );
          })
        }else{
          resolve( null );
        }
      }).catch( function( err ){
        console.log( err );
        resolve( null );
      });
    }else{
      gameids = {};
      resolve( true );
    }
  });
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

async function validateDigit( id, s ){
  var game = await getGame( id );
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

function timestamp2datetime( ts ){
  if( ts ){
    var dt = new Date( ts );
    var yyyy = dt.getFullYear();
    var mm = dt.getMonth() + 1;
    var dd = dt.getDate();
    var hh = dt.getHours();
    var nn = dt.getMinutes();
    var ss = dt.getSeconds();
    var datetime = yyyy + '-' + ( mm < 10 ? '0' : '' ) + mm + '-' + ( dd < 10 ? '0' : '' ) + dd;
//      + ' ' + ( hh < 10 ? '0' : '' ) + hh + ':' + ( nn < 10 ? '0' : '' ) + nn + ':' + ( ss < 10 ? '0' : '' ) + ss;
    return datetime;
  }else{
    return "";
  }
}

var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
