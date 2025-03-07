/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2017 Xirsys

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

*********************************************************************************/

'use strict';
//create simple random user id
var userName;// Username can come from URL add /index.html?name=User1
var sig;//signal instance.
var channelPath;//set this variable to specify a channel path

var oldest = [0,3,1,2];
var owner = ["","","",""]
var sprite = ["0CLEAR","","","","","","","","",""]

//custom: check URL for "ch" var, and set the channel accourdingly
var ch = decodeURI( (RegExp('ch' + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1] );
if(ch != 'null' ) channelPath = ch;
// console.log('channel path: ',channelPath);

//setup socket to signaling server.
function doSignal(){
    // console.log('doSignal()');
    sig = new $xirsys.signal( '/webrtc', userName, {channel:channelPath} );
    sig.on('message', msg => {
        var pkt = JSON.parse(msg.data);
        console.log('signal message! ',pkt);
        var payload = pkt.p;//the actual message data sent 
        var meta = pkt.m;//meta object
        var msgEvent = meta.o;//event label of message
        var toPeer = meta.t;//msg to user (if private msg)
        var fromPeer = meta.f;//msg from user
        if(!!fromPeer) {//remove the peer path to display just the name not path.
            var p = fromPeer.split("/");
            fromPeer = p[p.length - 1];
        }

        switch (msgEvent) {
            //first connect, list of all peers connected.
            case "peers":
                //this is first call when you connect, 
                //  so we can check for channelPath here dynamically.
                var sysNum = meta.f.lastIndexOf('__sys__');
                if(sysNum > -1 && !channelPath){
                    channelPath = meta.f.substring(0,sysNum);//save message path for sending.
                }
                initUI();
                break;
            //new peer connected
            case "peer_connected":
                break;
            //peer left.
            case "peer_removed":
                break;
            //message received. Call to display.
            case 'message':
                onUserMsg(payload, fromPeer, toPeer);
                break;
        }
    });
}

//were connected! lets setup the UI for user.
function initUI() {
    // Macros
    var $macroList = $("#macroList");
    for (let i = 1; i < 10; i++) {
        $macroList.append(`
            <li class="list-group-item settings-line">
                <div class="input-group">
                    <span class="input-group-addon">${i}: </span>
                    <input id="imageUrl${i}" type="text" class="form-control" placeholder="https://...">
                </div>
            </li>
        `)
    }

    $(document).keydown( e => {
        e.stopImmediatePropagation();
        if (e.altKey) {
            if (e.which==192) $('.settings-panel').toggle()
            else loadSprite(e.which-48);
        }
    })

    // Settings
    $('.settings-open').click( e => {
        console.log("open settings");
        $('.settings-panel').show();
    })

    
    $('#settings-close').click( e => {
        console.log("close settings");

        // Save Sprites
        for (let i = 1; i < 10; i++) {
            sprite[i] = ($("#flip"+i).is(":checked") ? 1 : 0) + $("#imageUrl"+i).val()
            if (sprite[i].slice(1)!="") document.cookie=`sprite${i}=${sprite[i]};`
        }

        // Set Background
        var bkgUrl = $('#backgroundUrl').val();
        if (bkgUrl=="") bkgUrl="CLEAR"
        sendMessage({bkg:bkgUrl})

        $('.settings-panel').hide();
    })
}

// Electron
if (window.electronAPI && window.electronAPI.onMacro) {
    $('.settings-open').hide();
    window.electronAPI.onMacro((num) => { loadSprite(num); });
}

function loadSprite(num) {
    //"https://lh3.googleusercontent.com/d/1cHUTSXVEivxCwRnXV7xlIgeHu-BSpFT6"
    //"https://lh3.googleusercontent.com/d/1xj34ImkK5LnDec4eUzGMuuV8IkSD-3ea"
    //"https://lh3.googleusercontent.com/d/1FAVoDSidzkWy_QA6xRd4AsxgPoTpL7ho"

    let msg = (num >=0 && num < 10 ? sprite[num] : "")
    if (!msg || msg.slice(1) == "") return;
    var pkt = sendMessage({msg:msg});
    if (pkt) onUserMsg(pkt.p, userName);
}

function onUserMsg(payload, frmPeer){
    console.log("Got a msg: ",payload)
    if (payload.msg) {
        var msg = payload.msg;
        var url = msg.slice(1);
        var flip = msg.slice(0,1);
        // msg = sanitizeString(msg);
        console.log('onUserMsg ' + frmPeer + ': ' + msg);
    
        // Set image
        setSprite(url, flip, frmPeer);
    }
    else if (payload.bkg) {
        setBackground(url);
    }
}

function getOldest() {
    var old = oldest.shift();
    oldest.push(old);
    return old;
}

function updateOldest(pos) {
    oldest.splice(oldest.indexOf(pos),1)
    oldest.push(pos)
}

function setSprite(spriteUrl, flip, userName) {
    var pos = owner.indexOf(userName);
    // console.log(userName + ' in slot ' + pos);

    if (pos==-1) {
        pos = getOldest();
        owner[pos] = userName;
    }
    else {
        updateOldest(pos);
    }

    $('#sprite'+pos).html((spriteUrl == "CLEAR" ? '' : '<image src="'+spriteUrl+'" class="sprite'+(flip ? ' flip' : '')+'">'))
}

function setBackground(imageUrl) {
    $('#background').html((imageUrl == "CLEAR" ? '' : '<image src="'+imageUrl+'" class="background">'))
}


function sendMessage(msg){
    if(msg == undefined || msg.length < 1) return;
    
    // console.log('sendMessage msg: ',msg);
    var pkt = sig.sendMessage(msg);
    return pkt;
}

function getURLParameter(name) {
    var ret = decodeURI( (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1] ) 
    return  ret == 'null' ? null : ret;
};

function guid(s='user') {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s + s4() + s4();// + s4() + s4() + s4() + s4() + s4() + s4();
}

function createUserName() {
    var urlName = getURLParameter("name");
    if(!!urlName){
        userName = urlName;
    } else {
        userName = guid();
    }
    return userName
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

function sanitizeString(str){
    str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
    return str.trim();
}

//Begin
$( document ).ready( () => {
    // console.log('pretty loaded!!');

    userName = getCookie("userName");
    if (userName=="") {
        userName = createUserName();
        document.cookie = document.cookie+` userName=${userName};`
    }
    console.log("Username: "+ userName)

    for (let i = 1; i < 10; i++) {
        sprite[i] = getCookie("sprite"+i);
        $("#imageUrl"+i).val(sprite[i].slice(1))
        $("#flip"+i).prop("checked",(sprite[i].slice(0,1)==0 ? false : true))
    }

    //doToken();
    doSignal();
});