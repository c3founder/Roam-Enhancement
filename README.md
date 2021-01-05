# Enhanced YouTube Player for Roam Research

## Installation 
To install, do the same thing you do for any roam/js script.

1. Create page in Roam (if not already present) called [[roam/js]]
1. If you previously installed this script by copying from a GitHub Gist, remove it from [[roam/js]] now.
1. Create a new block on this page and enter: ``
1. Nest under that block a Code Block
1. Make sure the code language is set as JavaScript
1. Paste the following into the new Code Block

	```javascript
	window.ytParams = {
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

	var s = document.createElement("script");
	s.type = "text/javascript";
	s.src = "https://c3founder.github.io/Roam-Enhancement/enhancedYouTube.js";
	document.getElementsByTagName("head")[0].appendChild(s);
	```
1. A warning box shows up asking you to review the risks of using roam/js.
1. Once you have reviewed the warning and understand/accept the risk, click Yes.
1. Refresh Roam and the script should now be installed!


## Functionalities  

### Responsive/Resizable Player 
You can set the original iframe size here in the code if you choose to copy 

- **Parameters:** Video height and width when the right sidebar is closed. 
	- vidHeight : height 
	- vidWidth : width 
- **Demo**

### YouTube Timestamp 
You can add timestamp to videos. 

- **Parameters:**
	- grabTitleKey: if in a DIRECT child block of the YT video, grabs the title and paste it to the beginning of the current block.
	- grabTimeKey: if in ANY child blocks of the YT video, grabs the current time of the player and paste it to the beginning.
- **Demo**

### In-text Controllable Player
You can control YT player while you are typing. If you have one player on the page, shortcuts will control that. When multi YT players are present shortcuts will control the playing one. If nothing is playing, shortcuts will control the last active player. 

- **Parameters:** 
	- playPauseKey: play/pause the most recent player or the first one
	- backwardKey: go backward 10 sec
	- forwardKey: go forward 10 sec
	- normalSpeedKey: set the playback rate to 1
	- speedUpKey: increase the rate by .25
	- speedDownKey: decrease the rate by .25
	- muteKey: mut the player
	- volUpKey: increase volume by 10/100
	- volDownKey: decrease volume by 10/100
- **Demo**