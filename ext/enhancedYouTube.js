
// ==UserScript==
// @name         Responsive YouTube Player & Timestamp Control & Player Controller for Roamresearch
// @author       Connected Cognition Crumbs <c3founder@gmail.com>
// @require 	 Roam42: Wait until Roam42 loads completely
// @version      0.4
// @description  Add timestamp controls to YouTube videos embedded in Roam and makes the player responsive. 
//               Parameters:
//               Shortcuts: for grabbing title and current time as a timestamp.
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

const ytParams = {
  //Player Size
  vidHeight : 480,
  vidWidth : 720,
  //Shortcuts
  grabTitleKey : 'alt+a t',
  grabTimeKey : 'alt+a n',  
  ////Speed Controls
  normalSpeedKey : 'alt+a 0',
  speedUpKey: 'alt+a =',
  speedDownKey: 'alt+a -',
  ////Volume Controls
  muteKey: 'alt+a m',
  volUpKey: 'alt+a i',
  volDownKey: 'alt+a k',
  ////Playback Controls
  playPauseKey : 'alt+a p', 
  backwardKey: 'alt+a j',
  forwardKey: 'alt+a l'
};

const activateYtVideos = () => {
	if(typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') return;
    Array.from(document.getElementsByTagName('IFRAME'))
        .filter(iframe => iframe.src.includes('youtube.com'))            
        .forEach(ytEl => {   
            if(ytEl.closest('.rm-zoom-item') !== null){
            	return; //ignore breadcrumbs and page log            
            }
            const block = ytEl.closest('.roam-block-container');          		
            if(ytEl.src.indexOf("enablejsapi") === -1){
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
  if(myspan === null) return null;
  const blockText = myspan.textContent;
  const matches = blockText.match(/^((?:\d+:)?\d+:\d\d)\D/); // start w/ m:ss or h:mm:ss
  if (!matches || matches.length < 2) return null;
  const timeParts = matches[1].split(':').map(part => parseInt(part));
  if (timeParts.length == 3) return timeParts[0]*3600 + timeParts[1]*60 + timeParts[2];
  else if (timeParts.length == 2) return timeParts[0]*60 + timeParts[1];
  else return null;
};

const extractVideoID = (url) => {
  var regExp = /^(https?:\/\/)?((www\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/\/?|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i;
  var match = url.match(regExp);
  if ( match && match[7].length == 11 ){
      return match[7];
  }else{
      return null; 
  }
};

const adjustIframe = (frameId, sideBarOpen) => {
  var child = document.getElementById(frameId); //Iframe
  var par = child.parentElement;
  if(sideBarOpen){
    child.style.position = 'absolute';
    child.style.margin = '0px';
    child.style.border = '0px';
    child.style.width = '100%';
    child.style.height = '100%';
    child.style.borderStyle = 'inset';
    child.style.borderRadius = '25px';
    par.style.position = 'relative';
    par.style.paddingBottom = '56.25%';     
    par.style.height = '0px';
  } else {
    child.style.position = null;
    child.style.margin = '0px';
    child.style.border = '0px';        
    child.style.width = ytParams.vidWidth + 'px';
    child.style.height = ytParams.vidHeight + 'px';
    child.style.borderStyle = 'inset';
    child.style.borderRadius = '25px';
    par.style.position = null;
    par.style.paddingBottom = '0px';   
    par.style.height = ytParams.vidHeight + 20 + 'px';
  }
}
    
const wrapIframe = (frameId) => {
  var child = document.getElementById(frameId); //Iframe
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
};

var ytReady = setInterval(() => {
  if(typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag); 	
    clearInterval(ytReady);
  }
}, 1000); 

//Fill out the current block with the given text
function fillTheBlock(givenTxt){
  var setValue = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  let newTextArea = document.querySelector("textarea.rm-block-input");               
  setValue.call(newTextArea,  givenTxt);
  var e = new Event('input', { bubbles: true });
  newTextArea.dispatchEvent(e);  	       
}
//Getting the playing player
function whatIsPlaying(){ 
    	console.log("Players length")
  	console.log(players.size)
	for (let [key, value] of players) {
         console.log(key);
      console.log(value.getPlayerState())
    }  
	for (let player of players.values()) {
          if(player.getPlayerState() == 1){
    		return player;
          }
    }    	
  	return null;
}

//Getting the first uncued player 
function whatIsPresent(){
  for (let [playerId, player] of players) {
    if(document.getElementById(playerId) === null){      
      continue;
    }
    return player;
  }
  return null;
}

//Getting the target player
//1)playing  or 2)most recent one or 3) the first one
function targetPlayer(){
  	console.log(players.size)
  	var playing = whatIsPlaying();
  	console.log("playing")
  	console.log(playing)
  	if(playing !== null)
      return playing;
  	console.log("paused")
  	console.log(paused)
  	if(paused !== null)
      return paused;
    //If nothing is playing return the fist player (if exists) that is not cued.
    if(players.size > 0)
      return whatIsPresent();     
	return null;
}
//Setting all shortcuts 
var mouseTrapReady = setInterval(() => {  
  if(Mousetrap === undefined) return;

  //Title
  Mousetrap.bind(ytParams.grabTitleKey, async function(e) {   
    e.preventDefault()
    if (e.srcElement.localName == "textarea") {
      var container = e.srcElement.closest('.roam-block-container');
      var parContainer = container.parentElement.closest('.roam-block-container');        
      var myIframe = parContainer.querySelector("iframe");
      if(myIframe === null) return false;
      var oldTxt = document.querySelector("textarea.rm-block-input").value;                  
      var newValue = players.get(myIframe.id).getVideoData().title + " " + oldTxt;
      fillTheBlock(newValue);
    }
    return false;
  });	
  //TimeStamp
  Mousetrap.bind(ytParams.grabTimeKey, async function(e) {   
    e.preventDefault()
    var playing = targetPlayer();
	if(playing !== null){
		var timeStr = new Date(playing.getCurrentTime() * 1000).toISOString().substr(11, 8)
		var oldTxt = document.querySelector("textarea.rm-block-input").value;                  
        fillTheBlock(timeStr + " " + oldTxt);        
		return false;  
    }
    return false;
  });	
  //Play-Pause
  Mousetrap.bind(ytParams.playPauseKey, async function(e) {   
    e.preventDefault();
    var playing = whatIsPlaying();
    //If something is playing => pause it
	if(playing !== null){
      playing.pauseVideo();
      paused = playing;            
      return false;
    }
    //If there is an active paused video => play it
    if(paused !== null){
      paused.playVideo();
      paused = null; 
      return false;
    }
    //If nothing is playing or paused => play the first video
    if(players.size > 0 ){        
      playing = whatIsPresent();
      if(playing !== null){
        playing.playVideo();
     	return false;
      }
    }
    return false;
  });	
  //Mute
  Mousetrap.bind(ytParams.muteKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();      
	if(playing !== null){
		if(playing.isMuted()){
          playing.unMute();
        } else {
          playing.mute();
        }
		return false;  
    }
    return false;
  });	
  //Volume Up
  Mousetrap.bind(ytParams.volUpKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();
	if(playing !== null){      	
		playing.setVolume(Math.min(playing.getVolume() + 10, 100))
		return false;  
    }
    return false;
  });
  //Volume Down
  Mousetrap.bind(ytParams.volDownKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();
	if(playing !== null){      	
		playing.setVolume(Math.max(playing.getVolume() - 10, 0))
		return false;  
    }
    return false;
  });  
  //Speed Up
  Mousetrap.bind(ytParams.speedUpKey, async function(e) {   
    e.preventDefault();    
    var playing = targetPlayer();
	if(playing !== null){      	
		playing.setPlaybackRate(Math.min(playing.getPlaybackRate() + 0.25, 2))
		return false;  
    }
    return false;
  });
  //Speed Down
  Mousetrap.bind(ytParams.speedDownKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();
	if(playing !== null){      	
		playing.setPlaybackRate(Math.max(playing.getPlaybackRate() - 0.25, 0))
		return false;  
    }
    return false;
  });
  //Normal Speed
  Mousetrap.bind(ytParams.normalSpeedKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();
	if(playing !== null){      	
		playing.setPlaybackRate(1, 0)
		return false;  
    }
    return false;
  });
  //Move Forward
  Mousetrap.bind(ytParams.forwardKey, async function(e) {   
    e.preventDefault();    
    var playing = targetPlayer();
	if(playing !== null){  
      	var duration = playing.getDuration();
      console.log(duration)
      	playing.seekTo(Math.min(playing.getCurrentTime() + 10, duration), true)		
		return false;  
    }
    return false;
  });
  //Move Backward
  Mousetrap.bind(ytParams.backwardKey, async function(e) {   
    e.preventDefault();
    var playing = targetPlayer();
	if(playing !== null){      	
		var duration = playing.getDuration();
      	playing.seekTo(Math.max(playing.getCurrentTime() - 10, 0), true)		
		return false;  
    }
    return false;
  });
  clearInterval(mouseTrapReady);
}, 1000); 

var paused = null;
const players = new Map(); 


setInterval(activateYtVideos, 1000);
