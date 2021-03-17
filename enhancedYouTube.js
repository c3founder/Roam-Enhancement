
// ==UserScript==
// @name         Responsive YouTube Player & Timestamp Control & Player Controller for Roamresearch
// @author       Connected Cognition Crumbs <c3founder@gmail.com>
// @require 	   -
// @version      0.4
// @description  Add timestamp controls to YouTube videos embedded in Roam and makes the player responsive. 
//               Parameters:
//               Shortcuts: 
//               	grabTitleKey: if in a DIRECT child block of the YT video, 
//									grabs the title and paste it to the beginning of the current block.
//					grabTimeKey: if in ANY child blocks of the YT video, 
//									grabs the current time of the player and paste it to the beginning.
//					normalSpeedKey: set the playback rate to 1
//					speedUpKey: increase the rate by .25
//					speedDownKey: decrease the rate by .25
//					muteKey: mut the player
//					volUpKey: increase volume by 10/100
//					volDownKey: decrease volume by 10/100
//					playPauseKey: play/pause the most recent player or the first one
//					backwardKey: go backward 10 sec
//					forwardKey: go forward 10 sec
//		         Player Size: Video height and width when the right sidebar is closed. 
// @match        https://*.roamresearch.com

/* mousetrap v1.6.5 craig.is/killing/mice */
(function (q, u, c) {
  function v(a, b, g) { a.addEventListener ? a.addEventListener(b, g, !1) : a.attachEvent("on" + b, g) } function z(a) { if ("keypress" == a.type) { var b = String.fromCharCode(a.which); a.shiftKey || (b = b.toLowerCase()); return b } return n[a.which] ? n[a.which] : r[a.which] ? r[a.which] : String.fromCharCode(a.which).toLowerCase() } function F(a) { var b = []; a.shiftKey && b.push("shift"); a.altKey && b.push("alt"); a.ctrlKey && b.push("ctrl"); a.metaKey && b.push("meta"); return b } function w(a) {
    return "shift" == a || "ctrl" == a || "alt" == a ||
      "meta" == a
  } function A(a, b) { var g, d = []; var e = a; "+" === e ? e = ["+"] : (e = e.replace(/\+{2}/g, "+plus"), e = e.split("+")); for (g = 0; g < e.length; ++g) { var m = e[g]; B[m] && (m = B[m]); b && "keypress" != b && C[m] && (m = C[m], d.push("shift")); w(m) && d.push(m) } e = m; g = b; if (!g) { if (!p) { p = {}; for (var c in n) 95 < c && 112 > c || n.hasOwnProperty(c) && (p[n[c]] = c) } g = p[e] ? "keydown" : "keypress" } "keypress" == g && d.length && (g = "keydown"); return { key: m, modifiers: d, action: g } } function D(a, b) { return null === a || a === u ? !1 : a === b ? !0 : D(a.parentNode, b) } function d(a) {
    function b(a) {
      a =
      a || {}; var b = !1, l; for (l in p) a[l] ? b = !0 : p[l] = 0; b || (x = !1)
    } function g(a, b, t, f, g, d) { var l, E = [], h = t.type; if (!k._callbacks[a]) return []; "keyup" == h && w(a) && (b = [a]); for (l = 0; l < k._callbacks[a].length; ++l) { var c = k._callbacks[a][l]; if ((f || !c.seq || p[c.seq] == c.level) && h == c.action) { var e; (e = "keypress" == h && !t.metaKey && !t.ctrlKey) || (e = c.modifiers, e = b.sort().join(",") === e.sort().join(",")); e && (e = f && c.seq == f && c.level == d, (!f && c.combo == g || e) && k._callbacks[a].splice(l, 1), E.push(c)) } } return E } function c(a, b, c, f) {
      k.stopCallback(b,
        b.target || b.srcElement, c, f) || !1 !== a(b, c) || (b.preventDefault ? b.preventDefault() : b.returnValue = !1, b.stopPropagation ? b.stopPropagation() : b.cancelBubble = !0)
    } function e(a) { "number" !== typeof a.which && (a.which = a.keyCode); var b = z(a); b && ("keyup" == a.type && y === b ? y = !1 : k.handleKey(b, F(a), a)) } function m(a, g, t, f) {
      function h(c) { return function () { x = c; ++p[a]; clearTimeout(q); q = setTimeout(b, 1E3) } } function l(g) { c(t, g, a); "keyup" !== f && (y = z(g)); setTimeout(b, 10) } for (var d = p[a] = 0; d < g.length; ++d) {
        var e = d + 1 === g.length ? l : h(f ||
          A(g[d + 1]).action); n(g[d], e, f, a, d)
      }
    } function n(a, b, c, f, d) { k._directMap[a + ":" + c] = b; a = a.replace(/\s+/g, " "); var e = a.split(" "); 1 < e.length ? m(a, e, b, c) : (c = A(a, c), k._callbacks[c.key] = k._callbacks[c.key] || [], g(c.key, c.modifiers, { type: c.action }, f, a, d), k._callbacks[c.key][f ? "unshift" : "push"]({ callback: b, modifiers: c.modifiers, action: c.action, seq: f, level: d, combo: a })) } var k = this; a = a || u; if (!(k instanceof d)) return new d(a); k.target = a; k._callbacks = {}; k._directMap = {}; var p = {}, q, y = !1, r = !1, x = !1; k._handleKey = function (a,
      d, e) { var f = g(a, d, e), h; d = {}; var k = 0, l = !1; for (h = 0; h < f.length; ++h)f[h].seq && (k = Math.max(k, f[h].level)); for (h = 0; h < f.length; ++h)f[h].seq ? f[h].level == k && (l = !0, d[f[h].seq] = 1, c(f[h].callback, e, f[h].combo, f[h].seq)) : l || c(f[h].callback, e, f[h].combo); f = "keypress" == e.type && r; e.type != x || w(a) || f || b(d); r = l && "keydown" == e.type }; k._bindMultiple = function (a, b, c) { for (var d = 0; d < a.length; ++d)n(a[d], b, c) }; v(a, "keypress", e); v(a, "keydown", e); v(a, "keyup", e)
  } if (q) {
    var n = {
      8: "backspace", 9: "tab", 13: "enter", 16: "shift", 17: "ctrl",
      18: "alt", 20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home", 37: "left", 38: "up", 39: "right", 40: "down", 45: "ins", 46: "del", 91: "meta", 93: "meta", 224: "meta"
    }, r = { 106: "*", 107: "+", 109: "-", 110: ".", 111: "/", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'" }, C = { "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/", "|": "\\" }, B = {
      option: "alt", command: "meta", "return": "enter",
      escape: "esc", plus: "+", mod: /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "meta" : "ctrl"
    }, p; for (c = 1; 20 > c; ++c)n[111 + c] = "f" + c; for (c = 0; 9 >= c; ++c)n[c + 96] = c.toString(); d.prototype.bind = function (a, b, c) { a = a instanceof Array ? a : [a]; this._bindMultiple.call(this, a, b, c); return this }; d.prototype.unbind = function (a, b) { return this.bind.call(this, a, function () { }, b) }; d.prototype.trigger = function (a, b) { if (this._directMap[a + ":" + b]) this._directMap[a + ":" + b]({}, a); return this }; d.prototype.reset = function () {
      this._callbacks = {};
      this._directMap = {}; return this
    }; d.prototype.stopCallback = function (a, b) { if (-1 < (" " + b.className + " ").indexOf(" mousetrap ") || D(b, this.target)) return !1; if ("composedPath" in a && "function" === typeof a.composedPath) { var c = a.composedPath()[0]; c !== a.target && (b = c) } return "INPUT" == b.tagName || "SELECT" == b.tagName || "TEXTAREA" == b.tagName || b.isContentEditable }; d.prototype.handleKey = function () { return this._handleKey.apply(this, arguments) }; d.addKeycodes = function (a) { for (var b in a) a.hasOwnProperty(b) && (n[b] = a[b]); p = null };
    d.init = function () { var a = d(u), b; for (b in a) "_" !== b.charAt(0) && (d[b] = function (b) { return function () { return a[b].apply(a, arguments) } }(b)) }; d.init(); q.Mousetrap = d; "undefined" !== typeof module && module.exports && (module.exports = d); "function" === typeof define && define.amd && define(function () { return d })
  }
})("undefined" !== typeof window ? window : null, "undefined" !== typeof window ? document : null);

Mousetrap.prototype.stopCallback = function () { return false }


const ytParams = window.ytParams;

const activateYtVideos = () => {
  if (typeof (YT) == 'undefined') return;
  Array.from(document.getElementsByTagName('IFRAME'))
    .filter(iframe => iframe.src.includes('youtube.com'))
    .forEach(ytEl => {
      if (ytEl.closest('.rm-zoom-item') !== null) {
        return; //ignore breadcrumbs and page log            
      }
      const block = ytEl.closest('.roam-block-container');
      if (ytEl.src.indexOf("enablejsapi") === -1) {
        var ytId = extractVideoID(ytEl.src);
        var frameId = "yt-" + ytEl.closest('.roam-block').id;
        ytEl.parentElement.id = frameId;
        ytEl.remove();
        players.set(frameId, new window.YT.Player(frameId, {
          height: ytParams.vidHeight,
          width: ytParams.vidWidth,
          videoId: ytId
        }));
        wrapIframe(frameId);
      } else {
        var frameId = ytEl.id
      }
      addTimestampControls(block, players.get(frameId));
      var sideBarOpen = document.getElementById("right-sidebar").childElementCount - 1;
      //Make iframes flexible
      adjustIframe(frameId, sideBarOpen);
    });
};

const addTimestampControls = (block, player) => {
  if (block.children.length < 2) return null;
  const childBlocks = Array.from(block.children[1].querySelectorAll('.rm-block__input'));
  childBlocks.forEach(child => {
    const timestamp = getTimestamp(child);
    const buttonIfPresent = getControlButton(child);
    const timestampChanged = buttonIfPresent !== null && timestamp != buttonIfPresent.dataset.timestamp;
    if (buttonIfPresent !== null && (timestamp === null || timestampChanged)) {
      buttonIfPresent.remove();
    }
    if (timestamp !== null && (buttonIfPresent === null || timestampChanged)) {
      addControlButton(child, timestamp, () => player.seekTo(timestamp, true));
    }
  });
};

const getControlButton = (block) => block.parentElement.querySelector('.timestamp-control');

const addControlButton = (block, timestamp, fn) => {
  const button = document.createElement('button');
  button.innerText = '►';
  button.classList.add('timestamp-control');
  button.dataset.timestamp = timestamp;
  button.style.borderRadius = '50%';
  button.addEventListener('click', fn);
  block.parentElement.insertBefore(button, block);
};

const getTimestamp = (block) => {
  var myspan = block.querySelector('span')
  if (myspan === null) return null;
  const blockText = myspan.textContent;
  const matches = blockText.match(/^((?:\d+:)?\d+:\d\d)\D/); // start w/ m:ss or h:mm:ss
  if (!matches || matches.length < 2) return null;
  const timeParts = matches[1].split(':').map(part => parseInt(part));
  if (timeParts.length == 3) return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
  else if (timeParts.length == 2) return timeParts[0] * 60 + timeParts[1];
  else return null;
};

const extractVideoID = (url) => {
  var regExp = /^(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/\/?|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  var match = url.match(regExp);
  if (match && match[7].length == 11) {
    return match[7];
  } else {
    return null;
  }
};

const adjustIframe = (frameId, sideBarOpen) => {
  var child = document.getElementById(frameId); //Iframe
  var par = child.parentElement;
  if (sideBarOpen) {
    child.style.position = 'absolute';
    child.style.margin = '0px';
    child.style.border = ytParams.border; //'0px';
    child.style.width = '100%';
    child.style.height = '100%';
    child.style.borderStyle = ytParams.borderStyle; //'inset';
    child.style.borderRadius = ytParams.borderRadius; //'25px';
    par.style.position = 'relative';
    par.style.paddingBottom = '56.25%';
    par.style.height = '0px';
  } else {
    child.style.position = null;
    child.style.margin = '0px';
    child.style.border = ytParams.border; //'0px';        
    child.style.width = ytParams.vidWidth + 'px';
    child.style.height = ytParams.vidHeight + 'px';
    child.style.borderStyle = ytParams.borderStyle; //'inset';
    child.style.borderRadius = ytParams.borderRadius; //'25px';
    par.style.position = null;
    par.style.paddingBottom = '0px';
    par.style.height = ytParams.vidHeight + 20 + 'px';
  }
}

const wrapIframe = (frameId) => {
  var child = document.getElementById(frameId); //Iframe
  const videoWrapper = child.closest('.rm-iframe__spacing-wrapper');
  if (videoWrapper) 
    videoWrapper.replaceWith(...videoWrapper.childNodes);   
  var par = document.createElement('div');
  child.parentNode.insertBefore(par, child);
  par.appendChild(child);
  child.style.position = 'absolute';
  child.style.margin = '0px';
  child.style.border = '0px';
  child.style.width = '100%';
  child.style.height = '100%';
  par.style.position = 'relative';
  par.style.paddingBottom = '56.25%';
  par.style.height = '0px';
  child.classList.remove('rm-iframe__container', 'rm-video-player__container', 'hoverparent');
};

var ytReady = setInterval(() => {
  if (typeof (YT) == 'undefined' || typeof (YT.Player) == 'undefined') {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    clearInterval(ytReady);
  }
}, 1000);

//Fill out the current block with the given text
function fillTheBlock(givenTxt) {
  var setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  let newTextArea = document.querySelector("textarea.rm-block-input");
  setValue.call(newTextArea, givenTxt);
  var e = new Event('input', { bubbles: true });
  newTextArea.dispatchEvent(e);
}
//Getting the playing player
function whatIsPlaying() {
  for (let player of players.values()) {
    if (player.getPlayerState() == 1) {
      return player;
    }
  }
  return null;
}

//Getting the first uncued player 
function whatIsPresent() {
  for (let [playerId, player] of players) {
    if (document.getElementById(playerId) === null) {
      continue;
    }
    return player;
  }
  return null;
}

//Getting the target player
//1)playing  or 2)most recent one or 3) the first one
function targetPlayer() {
  var playing = whatIsPlaying();
  if (playing !== null)
    return playing;
  if (paused !== null)
    return paused;
  //If nothing is playing return the fist player (if exists) that is not cued.
  if (players.size > 0)
    return whatIsPresent();
  return null;
}
//Setting all shortcuts 
//Title
Mousetrap.bind(ytParams.grabTitleKey, async function (e) {
  e.preventDefault()
  if (e.srcElement.localName == "textarea") {
    var container = e.srcElement.closest('.roam-block-container');
    var parContainer = container.parentElement.closest('.roam-block-container');
    var myIframe = parContainer.querySelector("iframe");
    if (myIframe === null) return false;
    var oldTxt = document.querySelector("textarea.rm-block-input").value;
    var newValue = players.get(myIframe.id).getVideoData().title + " " + oldTxt;
    fillTheBlock(newValue);
  }
  return false;
}, 'keydown');
//TimeStamp
Mousetrap.bind(ytParams.grabTimeKey, async function (e) {
  e.preventDefault()
  var playing = targetPlayer();
  if (playing !== null) {
    var timeStr = new Date(playing.getCurrentTime() * 1000).toISOString().substr(11, 8)
    var oldTxt = document.querySelector("textarea.rm-block-input").value;
    fillTheBlock(timeStr + " " + oldTxt);
    return false;
  }
  return false;
}, 'keydown');
//Play-Pause
Mousetrap.bind(ytParams.playPauseKey, async function (e) {
  e.preventDefault();
  var playing = whatIsPlaying();
  //If something is playing => pause it
  if (playing !== null) {
    playing.pauseVideo();
    paused = playing;
    return false;
  }
  //If there is an active paused video => play it
  if (paused !== null) {
    paused.playVideo();
    paused = null;
    return false;
  }
  //If nothing is playing or paused => play the first video
  if (players.size > 0) {
    playing = whatIsPresent();
    if (playing !== null) {
      playing.playVideo();
      return false;
    }
  }
  return false;
}, 'keydown');
//Mute
Mousetrap.bind(ytParams.muteKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    if (playing.isMuted()) {
      playing.unMute();
    } else {
      playing.mute();
    }
    return false;
  }
  return false;
}, 'keydown');
//Volume Up
Mousetrap.bind(ytParams.volUpKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    playing.setVolume(Math.min(playing.getVolume() + 10, 100))
    return false;
  }
  return false;
}, 'keydown');
//Volume Down
Mousetrap.bind(ytParams.volDownKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    playing.setVolume(Math.max(playing.getVolume() - 10, 0))
    return false;
  }
  return false;
}, 'keydown');
//Speed Up
Mousetrap.bind(ytParams.speedUpKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    playing.setPlaybackRate(Math.min(playing.getPlaybackRate() + 0.25, 2))
    return false;
  }
  return false;
}, 'keydown');
//Speed Down
Mousetrap.bind(ytParams.speedDownKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    playing.setPlaybackRate(Math.max(playing.getPlaybackRate() - 0.25, 0))
    return false;
  }
  return false;
}, 'keydown');
//Normal Speed
Mousetrap.bind(ytParams.normalSpeedKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    playing.setPlaybackRate(1, 0)
    return false;
  }
  return false;
}, 'keydown');
//Move Forward
Mousetrap.bind(ytParams.forwardKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    var duration = playing.getDuration();
    playing.seekTo(Math.min(playing.getCurrentTime() + 10, duration), true)
    return false;
  }
  return false;
}, 'keydown');
//Move Backward
Mousetrap.bind(ytParams.backwardKey, async function (e) {
  e.preventDefault();
  var playing = targetPlayer();
  if (playing !== null) {
    var duration = playing.getDuration();
    playing.seekTo(Math.max(playing.getCurrentTime() - 10, 0), true)
    return false;
  }
  return false;
}, 'keydown');

var paused = null;
const players = new Map();

setInterval(activateYtVideos, 1000);
