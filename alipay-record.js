$.get(chrome.extension.getURL('/control-template.html'), function(data) {
  $(data).prependTo('body');

  $('input.token').on('click', function() {
    var t = prompt('请输入密钥：');
    if (t != null && t != '') {
      chrome.storage.local.set({"token": t}, function() {
        token = t;
      })
    }
  });
  $('input.account').on('click', function() {
    var t = prompt('请输入账号：');
    if (t != null && t != '') {
      chrome.storage.local.set({"account": t}, function() {
        account = t;
        $('#current_account').text(account)
      })
    }
  });

  $('input.start').on('click', function() {
    if (token == '') {
      alert('请先设置密钥!');
      return
    }
    if (account == '') {
      alert('请先设置账号!');
      return
    }
    console.log('i click the start button to start the extension');
    chrome.storage.local.set({"running": true}, function() {
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        chrome.extension.sendMessage({cmd: 'start'},function(data){
          set_form();
          search();
        });
      },3000);
    })
  });
  $('input.stop').on('click', function() {
    console.log('i click the stop button to stop the extension');
    chrome.storage.local.set({"running": false}, function() {
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        chrome.extension.sendMessage({cmd: 'stop'},function(data){
          location.reload();
        });
      },3000);
    })
  });
  $('select.env').on('change', function() {
    chrome.storage.local.set({"env": $(this).val()});
  });

});

chrome.extension.sendMessage({cmd: 'watchdog'});

var token = '';
var account = '';
var api_url = {
  "development": 'https://192.168.1.20:8190/index.php/Admin/ClientApi/alipay_charge',
  "production": "https://disi.se/index.php/Admin/ClientApi/alipay_charge"
};

messageListener();

chrome.storage.local.get(null, function(data) {
  console.log(data);
  if ("token" in data) {
    token = data['token']
  }
  if ("account" in data) {
    account = data['account'];
    $('#current_account').text(account);
  }
  if ("env" in data) {
    $('select.env').val(data['env']);
  }
  if ("running" in data && data["running"] == true) {
    console.log('now the extension status is running');
    $('#state').text('运行中');
    chrome.extension.sendMessage({cmd: 'searched'});

    setInterval(function() {
      t = $('#timer').data('timer');
      t = t - 1;
      if(t>=0) {
        $('#timer').text(t);
        $('#timer').data('timer', t);
      }
    }, 1000);
    var trans = collection_trans();
    if (trans) {
      submit_trans(trans);
    }
  }
  else {
    console.log('now the extension status is stop');
    $('#state').text('停止');
  }

});




function set_form() {
  $('select#tradeStatus').val('success');
  $('select#fundFlow').val('in');
  $('input[name="tradeType"]').val('tranAlipay');
}

function collection_trans() {
  var trs = $('table#tradeRecordsIndex tbody tr');
  var results = [];
  trs.each(function(i, tr) {
    var tds = $(tr).find('td');
    var trade_no = $(tds[3]).find('p:contains("交易号:")').text();
    trade_no = trade_no.replace('交易号:','');
    if (trade_no == '') {
      trade_no = $(tds[3]).find('p:contains("流水号:")').text();
      trade_no = trade_no.replace('流水号:','')
    }
    var amount = $(tds[5]).find('span.amount-pay-in').text();
    amount = amount.replace('+','');
    results.push({"name": "trans[][key]", "value": trade_no});
    results.push({"name": "trans[][value]", "value": amount});
  });

  return results;
}

function submit_trans(trans) {

  trans.push({"name": "token", "value": token});
  trans.push({"name": "account", "value": account});
  var url = api_url[$('select.env').val()];
  $.post(url, trans, function(data) {
    if (data == 'true') {
      $("#error").text('');
    }
    else {
      $('#error').text(data);
    }
  }).fail(function(data) {
    $('#error').text(data.responseText);
  })
}

function messageListener(){
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if(message.cmd === 'search'){
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        set_form();
        search();

      },3000);
    }
  });
}

function search() {
  var form = $('#J-set-query-form');
  console.log(form);
  if(form.length > 0){
    console.log('searched');
    chrome.extension.sendMessage({cmd: 'searched'});
    $('#J-set-query-form').click();
  }
}
