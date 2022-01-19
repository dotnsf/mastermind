
var id = null;
var length = 4;
var highlow = 0;
var validation = 0;
var count = 0;
var histories = [];

$(function(){
  $('#brand-title').html( 'MasterMind via <a target="_blank" href="' + base_url + '/doc">API</a>' );

	var obj = getBusyOverlay( 'viewport', { color:'black', opacity:0.5, text:'loading..', style:'text-decoration:blink;font-weight:bold;font-size:12px;color:white' } );
  mmPing().then( function(){
    doGameInit();

    obj.remove();
    obj = null;
  });

  $('#guess_value').keyup( function(){
    if( validation ){
      var text = $('#guess_value').val();
      if( text && text.length == length ){
        for( var i = 0; i < histories.length; i ++ ){
          var h_value = histories[i].value;
          var h_hit = histories[i].hit;
          var h_error = histories[i].error;
          var h_highlow = histories[i].highlow;
          if( mmValidate( text, h_value, h_hit, h_error, h_highlow ) ){
            $('#history_' + i ).css( 'background-color', '#cfc' );
          }else{
            $('#history_' + i ).css( 'background-color', '#fcc' );
          }
        }
      }else{
        $('.history_').css( 'background-color', '#fff' );
      }
    }else{
      $('.history_').css( 'background-color', '#fff' );
    }
  });
});

function titleQuestions(){
  var num = '';
  for( var i = 0; i < length; i ++ ){
    num += '?';
  }
  $('#display_div').html( num );
}

function doGameInit(){
  id = null;
  length = parseInt( $('#select_length').val() );
  highlow = parseInt( $('#select_highlow').val() );
  validation = parseInt( $('#select_validation').val() );
  count = 0;
}

async function doGuess(){
  var value = $('#guess_value').val();
  if( id && value ){
    var r1 = await mmGuess( id, value );
    var r2 = await mmStatus( id );

    if( r1 && r1.status ){
      $('#guess_value').val( '' );

      if( r2 && r2.status && r2.game && r2.game.histories ){
        $('#histories_table_body').html( '' );
        histories = r2.game.histories;
        for( var i = 0; i < histories.length; i ++ ){
          var idx = i + 1;
          var value2 = histories[i].value;
          var hit2 = histories[i].hit;
          var error2 = histories[i].error;
          var timestamp2 = histories[i].timestamp;
          var highlow2 = histories[i].highlow;

          var tr = '<tr class="history_" id="history_' + i + '">'
            + '<td>' + idx + '</td>'
            + '<td>' + value2 + '</td>'
            + '<td>' + hit2 + ' ヒット<br/>' + error2 + ' エラー</td>';
          if( highlow2 ){
            tr += '<td>' + ( highlow2 != 'equal' ? 'Too ' + highlow2 : 'Bingo!' ) + '</td>';
          }

          tr += '<td>' + timestamp2datetime( timestamp2 ) + '</td>'
            + '</tr>';
          $('#histories_table_body').append( tr );
          if( hit2 == length ){
            $('#history_' + i ).css( 'background-color', '#8f8' );
          }
        }
      }

      if( r1.message ){
        $('#display_div').html( value );
        var ms = r2.game.histories[r2.game.histories.length-1].timestamp - r2.game.histories[0].timestamp; 

        var disp_sec = Math.floor( ms / 100 ) / 10
        alert( r2.game.histories.length + '回（' + disp_sec +  '秒）で解けました！' );

        $('#select_length').removeAttr( 'disabled' );
        $('#select_highlow').removeAttr( 'disabled' );
        $('#select_validation').removeAttr( 'disabled' );

        $('#guess_value').css( 'display', 'none' );
        $('#btn-guess').css( 'display', 'none' );
        $('#btn-giveup').css( 'display', 'none' );
        $('#btn-onemoregame').css( 'display', '' );

      }else{
        $('#btn-guess').css( 'display', '' );
        $('#btn-giveup').css( 'display', '' );
        $('#btn-onemoregame').css( 'display', 'none' );
        $('#guess_value').focus();
      }
    }
  }
}

async function doGiveup(){
  if( confirm( 'ギブアップしますか？' ) ){
    var r = await mmGiveup( id );

    $('#display_div').html( r.value );
    $('#guess_value').css( 'display', 'none' );
    $('#btn-guess').css( 'display', 'none' );
    $('#btn-giveup').css( 'display', 'none' );
    $('#btn-onemoregame').css( 'display', '' );

    $('#select_length').removeAttr( 'disabled' );
    $('#select_highlow').removeAttr( 'disabled' );
    $('#select_validation').removeAttr( 'disabled' );
  }
}

async function doOneMoreGame(){
  length = parseInt( $('#select_length').val() );
  highlow = parseInt( $('#select_highlow').val() );
  validation = parseInt( $('#select_validation').val() );

  titleQuestions();
  $('#histories_table_body').html( '' );
  histories = [];

  $('#select_length').attr( 'disabled', true );
  $('#select_highlow').attr( 'disabled', true );
  $('#select_validation').attr( 'disabled', true );

  $('#guess_value').css( 'display', '' );
  $('#btn-guess').css( 'display', '' );
  $('#btn-giveup').css( 'display', '' );
  $('#btn-onemoregame').css( 'display', 'none' );
  $('#guess_value').focus();

  var result = await mmInit( length, highlow );
  if( result && result.id ){
    id = result.id;
  }
}
