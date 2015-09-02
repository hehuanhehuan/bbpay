var running = false;
var last_watchdog_time = new Date().getTime();
var send = null;
var reload = null;
var day = new Date().getDay();
var search_times = 0;

setTimeout(watchdog, 1000);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    var response = null;
    send = sender;
    chrome.storage.local.get(null, function(data) {
        running = data.running;
    });
    if(message.cmd == 'watchdog') {
        console.log('i want to reset the watchdog');
        last_watchdog_time = new Date().getTime();

    }else if(message.cmd == 'start') {
        console.log('i want to start');
        response = {};
    }else if(message.cmd == 'stop') {
        console.log('i want to stop');
        response = {};
    }else if(message.cmd == 'searched') {
        reload = false;
    }
    sendResponse &&sendResponse(response);
});

function watchdog() {
    if (last_watchdog_time && running) {
        console.log("watchdog");
        var time = new Date().getTime();
        var watch_dog_running = parseInt((time - last_watchdog_time)/1000);
        console.log("watchdog"+"运行"+watch_dog_running+"秒");
        if(time - last_watchdog_time >= 60000) {
            var current_day = new Date().getDay();
            if(current_day == day){
                if (time - last_watchdog_time >= 120000) {
                    if (reload !== false) {
                        reloadpage();
                    } else {
                        search_times++;
                        if(search_times >=10){
                            reloadpage();
                        }else{
                            chrome.tabs.sendMessage(send.tab.id, {cmd: 'search'});
                        }
                    }
                }
            }else{
                reloadpage();
            }

        }
    }

    setTimeout(watchdog, 1000);
}

function reloadpage() {
    chrome.tabs.query({active: true, highlighted: true}, function(tabs) {
        if (tabs.length > 0) {
            var current_url = tabs[0].url;
            console.log(current_url);
            if (current_url.indexOf('consumeprod.alipay.com/record/advanced.htm') >=0) {
                console.log("执行reload");
                chrome.tabs.reload(tabs[0].id, function() {
                    //success
                    day = new Date().getDay();
                    search_times = 0;
                });
            }
            if (current_url.indexOf('mbillexprod.alipay.com/enterprise/accountDetail.htm') >=0) {
                console.log("执行reload");
                chrome.tabs.reload(tabs[0].id, function() {
                    //success
                    day = new Date().getDay();
                    search_times = 0;
                });
            }
            last_watchdog_time = new Date().getTime();
        }
    });
}