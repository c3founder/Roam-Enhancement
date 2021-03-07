# PDF Highlighter for Roam Research 

## Installation 

### JavaScript

To install, do the same thing you do for any roam/js script.

1. Create page in Roam (if not already present) called [[roam/js]]

1. If you previously installed this script by copying from a GitHub Gist, remove it from [[roam/js]] now.

1. Create a new block on this page and enter: ```

1. Nest under that block a Code Block

1. Make sure the code language is set as JavaScript

1. Paste the following into the new Code Block

``` javascript
   window.pdfParams = {
	 //Highlight 
     ///Placement
     outputHighlighAt: 'cousin', //cousin, child
     highlightHeading: '**Highlights**', //for cousin mode only 
     appendHighlight: true, //append: true, prepend: false
     ///Rest of Highlight Options
     breadCrumbAttribute: 'Title', //Title, Author, Citekey, etc. 
     addColoredHighlight: true,//bring the color of highlights into your graph
     //Rerference to Highlight 
     ///Block References Related
     copyBlockRef: true,//false: copy captured text
     sortBtnText: 'sort them all!',//{{sort them all!}} btn will sort highlight refs.
     ///Block Reference Buttons  
     aliasChar: '✳', //use '' to disable
     textChar: 'T', //use '' to disable	
     //PDF Viewer
     pdfStaticHeight: 900,
     pdfStaticWidth: 1200,
     pdfMinWidth: 450,
     pdfMinHeight: 900,
     //Citation 
     ///Format   
     ////use Citekey and page in any formating string 
     ////page can be offset by `Page Offset` attribute. 
     ////common usecase: 
     /////Zotero imports with 'roam page title' = @Citekey and Citekey attribute
     ////examples:
     /////"[${Citekey}]([[@${Citekey}]])" 
     /////"[(${Citekey}, ${page})]([[@${Citekey}]])" 
     /////use '' to disable  
     citationFormat: '',
     ///BlockQuote 
     blockQPerfix: ''//use '' to disable. Alternatives are: > or [[>]].
   };
	var s = document.createElement("script");
	s.type = "text/javascript";
	s.src = "https://c3founder.github.io/Roam-Enhancement/enhancedPDF.js";
	document.getElementsByTagName("head")[0].appendChild(s);
```

1. A warning box shows up asking you to review the risks of using roam/js.

1. Once you have reviewed the warning and understand/accept the risk, click Yes.

1. Refresh Roam and the script should now be installed!

### CSS 

To install the CSS put this line in a CSS code block on you [[roam/css]] page: 

```css
@import url('https://c3founder.github.io/Roam-Enhancement/enhancedPDF.css');
```

## Functionalities   
Full tutorial here: 
- [![pdfhighlighter](https://img.youtube.com/vi/-yVqQqUEHKI/0.jpg)](https://www.youtube.com/watch?v=-yVqQqUEHKI&ab_channel=CCC)

# Enhanced YouTube Player for Roam Research

## Installation 
### JavaScript

To install, do the same thing you do for any roam/js script.

1. Create page in Roam (if not already present) called [[roam/js]]

1. If you previously installed this script by copying from a GitHub Gist, remove it from [[roam/js]] now.

1. Create a new block on this page and enter: ```

1. Nest under that block a Code Block

1. Make sure the code language is set as JavaScript

1. Paste the following into the new Code Block

	```javascript
	window.ytParams = {
	  //Player
	  ////Player Style
	  border : '0px',
	  borderStyle : 'inset',
	  borderRadius : '25px',
	  ////Player Size
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

### CSS

To install the CSS put this line in a CSS code block on you [[roam/css]] page: 

~~~css
@import url('https://c3founder.github.io/Roam-Enhancement/enhancedYouTube.css');
~~~

## Functionalities  

### Responsive/Resizable Player 
You can set the original iframe size here in the code plus the border style. 

- **Parameters:** Border style of the video and its height and width when the right sidebar is closed. 
	- borderStyle : border style 
	- border : [border thickness](https://www.w3schools.com/jsref/prop_style_borderstyle.asp)
	- borderRadius : curvature of corners
	- vidHeight : height 
	- vidWidth : width 
- **Demo**
	- [![responsive player](https://img.youtube.com/vi/vJ3gPX89fz0/0.jpg)](https://www.youtube.com/watch?v=vJ3gPX89fz0&ab_channel=ConnectedCognitionCrumbs)


### YouTube Timestamp 
You can add timestamps to videos using a shortcut. 

- **Parameters:**
  - grabTitleKey: if in a DIRECT child block of the YT video, grabs the title and paste it to the beginning of the current block.
  - grabTimeKey: if in ANY child blocks of the YT video, it captures the player's current time and pastes it to the beginning of the block.
- **Demo**
	- [![timestamp](https://img.youtube.com/vi/Kgo_Lkw-2CA/0.jpg)](https://www.youtube.com/watch?v=Kgo_Lkw-2CA&ab_channel=ConnectedCognitionCrumbs)


### In-text Controllable Player
You can control the YT player while you are typing. 

- If you have one player on the page, shortcuts will control the player, easy. 
- When multi YT players are present 
  - If only one is playing: shortcuts will control the playing one. 
  - If nothing is playing, shortcuts will control the last playing video you paused by shortcut (not mouse click). For example, you can mute/unmute or -10/+10 the last video you paused or play it with `alt+a p`.
  - If multiple videos are playing, everything is ambiguous, so you can only control the first one (according to the order of appearance on the page). You can pause them all in order by `alt+a p`, though. 

- **Parameters:** 
	- playPauseKey: play/pause the most recent player or the first one
	- backwardKey: go backward 10 sec
	- forwardKey: go forward 10 sec
	- normalSpeedKey: set the playback rate to 1
	- speedUpKey: increase the rate by .25
	- speedDownKey: decrease the rate by .25
	- muteKey: mute the player
	- volUpKey: increase volume by 10/100
	- volDownKey: decrease volume by 10/100
- **Demo**

	- [![timestamp](https://img.youtube.com/vi/ADJvhW31xj4/0.jpg)](https://www.youtube.com/watch?v=ADJvhW31xj4&ab_channel=ConnectedCognitionCrumbs)

- **Known Issues with Shortcuts:**
	- **Common installation problem:** You need to have the code block as the child of {{[[roam/js]]}} so you need a tab befor the code block.	
	- **Shortcuts in mac:** I'm not a mac user, I've compiled this list based on feedback I received, this is why the language is uncertain; I have not tested them myself. Special thanks to [Abhay Prasanna](https://twitter.com/AbhayPrasanna) and [Jerome Wong](https://github.com/DarkArcZ).
		- For mac users 'option' instead of 'alt' has worked. 
			- For example, you can replace 'alt+a n' with 'option+a n'
		- I specific keyboard modes 'option+a' will generate 'å' in mac. You can read about it [here](https://en.wikipedia.org/wiki/Option_key#Alternative_keyboard_input).
			- It seems you can fix this by changing the keyboard Input Source to "Unicode Hex Input" from "ABC".
				1. Go to Keyboard on your Mac System Preferences
				1. Click on Input Sources on the top
				1. Press the "+" button and add "Unicode Hex Input"
				1. Go to where you pasted the code on roam
				1. Change the shortcut key to something else besides alt (cmd, option, ctrl)
				1. Restart Roam

	- **General notes:**	
		- To press 'alt+a n' you need to hold alt and a together for a fraction of a second (like when you press alt+tab to switch windows) and then RELEASE them and tap 'n'.
		- Make sure that the perfix 'alt+a' ('option+a' in mac), is not already assigned and captured by other programs. 
			- Those programs can be installed on your operating system or be extensions in your browsers. 
			- If there is a conflict, you need to change the shortcut of either that program or YT extension.
		- You can have 'alt+a+n' which means you need to hold all three buttons. 
			- Pros: It is harder to miss compare to 'alt+a n'.
			- Cons: You need to make sure that there is no conflict with both sub-sequence key combination, i.e., 'alt+a' and 'alt+n'.
	

