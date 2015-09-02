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
    }else{
      var accountEmail = $('.accountEmail').text();
      if(account != accountEmail){
        alert('设置账号和本页面中显示的不一致!');
        return
      }
    }
    console.log('i click the start button to start the extension');
    chrome.storage.local.set({"running": true}, function() {
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        chrome.extension.sendMessage({cmd: 'start'},function(data){
          set_form();
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
var running = null;
var timer = 120;
var timer_count = null;
messageListener();

chrome.storage.local.get(null, function(data) {
  console.log(data);
  running = data['running'];
  if ("token" in data) {
    token = data['token'];
  }
  if ("account" in data) {
    account = data['account'];
    $('#current_account').text(account);
    var accountEmail = $('.accountEmail').text();
    if(account != accountEmail){
      alert('设置账号和本页面中显示的不一致!');
      return
    }
  }
  if ("env" in data) {
    $('select.env').val(data['env']);
  }
  if ("running" in data && data["running"] == true) {
    console.log('now the extension status is running');
    $('#state').text('运行中');
    chrome.extension.sendMessage({cmd: 'searched'});
    set_form();
  }
  else {
    console.log('now the extension status is stop');
    $('#state').text('停止');
  }

});


function set_form() {
  var last_thirty_days = $('#quickDatePicker').find('a:contains("最近30天")');
  console.log(last_thirty_days);
  if(last_thirty_days.length > 0){
    if(last_thirty_days.hasClass('block-link-active')){
      console.log('当前的选择是最近30天');
    }else{
      console.log('当前的选择不是最近30天');
      setTimeout(function() {
        chrome.extension.sendMessage({cmd: 'watchdog'});
        last_thirty_days[0].click();
      },2000);
    }
  }else{
    console.log('无最近30天的时间选择');
    setTimeout(function() {
      chrome.extension.sendMessage({cmd: 'watchdog'});
      window.location.reload(true);
    },3000);
  }
}

function collection_trans() {
  var trs = $('.detail-table table tbody tr');
  var results = [];
  trs.each(function(i, tr) {
    var tds = $(tr).find('td');
    var trade_no = $(tds[1]).find('a').attr('data-title');
    var amount = $(tds[4]).text();
    amount = amount.replace('+','');
    amount = amount.replace(',','');
    if(trade_no && amount) {
      results.push({"name": "trans[][key]", "value": trade_no});
      results.push({"name": "trans[][value]", "value": amount});
    }
  });

  return results;
}

function submit_trans(trans) {

  trans.push({"name": "token", "value": token});
  trans.push({"name": "account", "value": account});
  var url = api_url[$('select.env').val()];
  $.post(url, trans, function (data) {
    if (data == 'true') {
      $("#error").text('');
    }
    else {
      $('#error').text(data);
    }
  }).fail(function (data) {
    $('#error').text(data.responseText);
  });
}

function messageListener(){
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if(message.cmd === 'refresh'){

    }
    if(message.cmd === 'search'){
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        search();
      },500);
    }
  });
}

function search() {
  var form = $('#J_combineSearchBtn input');
  console.log(form);
  if(form.length > 0){
    console.log('searched');


    chrome.extension.sendMessage({cmd: 'searched'});
    form[0].click();
  }
}


var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (running) {
        if(mutation.type == 'attributes') {
          if(mutation.target.className == "mi-form-link block-link block-link-active" && $('#J_loadingContent:visible').length==0){
            if(mutation.target.innerHTML== "最近30天"){
              console.log('当前的选择是最近30天');
              console.log(mutation);
              search();
            }else{
              console.log('当前的选择不是最近30天');
            }
          }
        }
        if( mutation.type == 'childList') {
          if( mutation.addedNodes.length > 0 ) {
            if( mutation.target.localName == 'tbody' ) {
              var type_checked = $('.type-switchs .mi-button-mblue');
              if(type_checked.length > 0 ){
                if(type_checked[0].textContent == '收 入'){
                  clearInterval(timer_count);
                  timer = 120;
                  timer_count = setInterval(function () {
                    timer = timer - 1;
                    if (timer >= 0) {
                      $('#timer').text(timer);
                      $('#timer').data('timer', timer);
                    } else {

                    }
                  }, 1000);

                  console.log(type_checked);
                  console.log(mutation);
                  var trans = collection_trans();
                  console.log(trans);
                  if (trans) {
                    submit_trans(trans);
                  }
                }else{
                  console.log('else');
                  var type_incharge = $('.type-switchs').find('a:contains("收 入")');
                  console.log(type_incharge);
                  if(type_incharge.length > 0){
                    console.log('找到收入选项卡');
                    type_incharge[0].click();
                  }else{
                    console.log('未找到收入选项卡');
                    setTimeout(function(){
                      chrome.extension.sendMessage({cmd: 'watchdog'});
                      window.location.reload(true);
                    },3000);
                  }
                }
              }
            }
          }
        }
    }
  })
});
var config = { attributes: true, childList: true, characterData: true, subtree: true, attributeOldValue: true };
observer.observe(document.body, config);
