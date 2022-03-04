//. solver.js
var request = require( 'request' );

var mm_name = 'MASTERMIND_NAME' in process.env ? process.env.MASTERMIND_NAME : '(solver)';
var mm_url = 'MASTERMIND_API_URL' in process.env ? process.env.MASTERMIND_API_URL : 'https://mastermind-restapi.herokuapp.com/';
var mm_length = 'MASTERMIND_LENGTH' in process.env ? parseInt( process.env.MASTERMIND_LENGTH ) : 4;
var mm_highlow = 'MASTERMIND_HIGHLOW' in process.env ? parseInt( process.env.MASTERMIND_HIGHLOW ) : 1;

async function solver_init( length, highlow, name ){
  return new Promise( function( resolve, reject ){
    var option = {
      url: mm_url + 'api/init?length=' + length + '&highlow=' + highlow + '&name=' + name,
      method: 'GET'
    };
    request( option, ( err, res, body ) => {
      if( err ){
        console.log( { err } );
        resolve( null );
      }else{
        body = JSON.parse( body );
        //console.log( { body } );
        resolve( body );
      }
    });
  });
}

async function solver_guess( id, value ){
  return new Promise( function( resolve, reject ){
    var option = {
      url: mm_url + 'api/guess?id=' + id + '&value=' + value,
      method: 'GET'
    };
    request( option, ( err, res, body ) => {
      if( err ){
        console.log( { err } );
        resolve( null );
      }else{
        body = JSON.parse( body );
        // body = { status: true, id: id, length: 4, value: value, hit: 1, error: 0, highlow: 'low' };
        //console.log( { body } );
        resolve( body );
      }
    });
  });
}


function next_digit( digit, length ){
  var num = ( digit.length == 0 ? -1 : parseInt( digit ) );
  var d = '' + ( num + 1 );

  while( d.length < length ){
    d = '0' + d;
  }

  return d;
}

function is_contradicted( value, histories, length, highlow ){
  var contradicted = false;

  if( value.length != length ){
    //. 文字数が一致していない場合は矛盾
    contradicted = true;
  }else{
    //. 同じ数字が使われていたら矛盾
    for( var i = 0; i < value.length && !contradicted; i ++ ){
      var c = value.charAt( i );
      if( value.lastIndexOf( c ) != i ){
        contradicted = true;
      }
    }

    //. 過去記録と一致していなかったら矛盾
    for( var i = 0; i < histories.length && !contradicted; i ++ ){
      var history = histories[i];
      /*
      history = {
        value: "6789",
        hit: 0,
        error: 1,
        highlow: "low"
      };
      */

      if( value == history.value ){
        contradicted = true;
      }else{
        var r = solver_count( value, history.value );
        if( r.hits == history.hit && r.errors == history.error ){
          if( highlow ){
            if( r.highlow != history.highlow ){
              contradicted = true;
            }
          }
        }else{
          contradicted = true;
        }
      }
    }
  }

  return contradicted;
}

function solver_count( target, value ){
  var hits = 0;
  var errors = 0;

  for( var i = 0; i < target.length; i ++ ){
    var c = target.charAt( i );
    var n = value.indexOf( c );
    if( n == i ){
      hits ++;
    }else if( n > -1 ){
      errors ++;
    }
  }

  var num_target = parseInt( target );
  var num_value = parseInt( value );
  var highlow = 'equal';
  if( num_target > num_value ){
    highlow = 'low';
  }else if( num_target < num_value ){
    highlow = 'high';
  }

  return { hits: hits, errors: errors, highlow: highlow };
}

function solver_digit( length, histories ){
  var digit = '';
  var b = true;
  while( b ){
    for( var i = 0; i < length; i ++ ){
      for( var j = 0; j < 10; j ++ ){
        var c = '' + j;
        if( digit.indexOf( j ) == -1 ){
          digit += c;
          j = 10;
        }
      }
    }

    if( is_contradicted( digit, histories ) ){
    }else{
      b = false;
    }
  }

  return digit;
}

function next_value( length, highlow, histories ){
  //. 小さい順にブルートフォースアタックをかける
  //. このアルゴリズムだと highlow は関係ない
  var value = '';
  var b = true;
  while( b ){
    value = next_digit( value, length );
    if( is_contradicted( value, histories, length, highlow ) ){
    }else{
      b = false;
    }
  }

  return value;
}

async function main(){
  //. 初期化
  var r = await solver_init( mm_length, mm_highlow, mm_name );
  //console.log( { r } );
  if( r && r.status && r.id ){
    var id = r.id;
    var histories = [];
    var result = null;

    do{
      var value = next_value( mm_length, mm_highlow, histories );
      result = await solver_guess( id, value );

      histories.push( { value: value, hit: result.hit, error: result.error, highlow: result.highlow } );
      /*
      history = {
        value: "6789",
        hit: 0,
        error: 1,
        highlow: "low"
      };
      */
    }while( result.hit < mm_length );

    console.log( 'value = ' + result.value + ' (' + histories.length + ')' );
    for( var i = 0; i < histories.length; i ++ ){
      var line = ' [' + ( i + 1 ) + '] ' + histories[i].value + ' : ' + histories[i].hit + 'H' + histories[i].error + 'E';
      if( mm_highlow ){
        line += '(' + histories[i].highlow + ')';
      }
      console.log( line );
    }
    console.log( '  => ' + mm_url + 'api/share?id=' + id );
  }
}

main();
