// ==UserScript==
// @name         Enhanced-PDF Extension for Roam Research
// @author       Ryan Muller @cicatriz and Connected Cognition Crumbs <c3founder@gmail.com>
// @require 	 -
// @version      0.5
// @match        https://*.roamresearch.com
// @description  Handle PDF Highlights.  
//		 MAIN OUTPUT MODES: 
//		 1) cousin
//		 Highlights are added as the cousin block. 
//       The breadCrumbAttribute & citeKeyAttribute are searched for in the PDF grand parent subtree
//		 - PDF grand parent block 
//		    - PDF parent block 
//			   - PDF block, e.g., {{pdf: https://firebasestorage.googleapis.com/v0/b/exampleurl}}
//		    - Highlight 
//		       - Cousin of the PDF block
//		 2) child
//		 Highlights are added as the child block:
//       The breadCrumbAttribute & citeKeyAttribute are searched for in the PDF parent subtree
//		 - PDF parent block 
//			- PDF block
//		       - Child of the PDF block
/*******************************************************/
/*******************Parameter BEGIN*********************/
const pdfParams = window.pdfParams;
/*******************Parameter END***********************/
/*******************************************************/

/*******************************************************/
/**********************Main BEGIN***********************/
window.setInterval(initPdf, 1000);
const serverPerfix = 'https://roampdf.web.app/?url=';
const pdfChar = '📑';
//const mainHlChar = null;

function initPdf() {
  Array.from(document.getElementsByTagName('iframe')).forEach(iframe => {
    if (!iframe.classList.contains('pdf-activated')){      
	    try {
          if (new URL(iframe.src).pathname.endsWith('.pdf')) {
            const originalPdfUrl = iframe.src; //the permanent pdfId
            iframe.id = "pdf-" + iframe.closest('.roam-block').id; //window level pdfId
			const pdfBlockUid = getUidOfContainingBlock(iframe); //for click purpose
            allPdfIframes.push(iframe); //save for interaction
            renderPdf(iframe); //render pdf through the server 
            sendHighlights(iframe, originalPdfUrl, pdfBlockUid);
          }
        } catch {} // some iframes have invalid src
    }
	if(iframe.src.startsWith(serverPerfix)){
		var sideBarOpen = document.getElementById("right-sidebar").childElementCount - 1;
		adjustPdfIframe(iframe, sideBarOpen);  
	}
  })
  activateButtons();
}
///////////////Responsive PDF Iframe 
function adjustPdfIframe(iframe, sideBarOpen){
	const reactParent = iframe.closest('.react-resizable')
	const reactHandle = reactParent.querySelector(".react-resizable-handle")
	const hoverParent = iframe.closest('.hoverparent')
	reactHandle.style.display = 'none';
	reactParent.style.width = '100%';
	reactParent.style.height = '100%';
  if(sideBarOpen){
    hoverParent.style.width = '100%';
    hoverParent.style.height = '100%';
  } else {
    hoverParent.style.width = `${pdfParams.pdfStaticWidth}px`
    hoverParent.style.height = `${pdfParams.pdfStaticHeight}px`
  }
}
/************************Main END***********************/
/*******************************************************/

/*******************************************************/
/*************Look for Highlight Delete BEGIN***********/
var hlDeletionObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(node => {
      if(typeof(node.classList) !== 'undefined'){
        if(node.classList.contains("roam-block-container")){ //if a block is deleted
             Array.from(node.getElementsByTagName('button')) //if it had a button
               .filter(isHighlightBtn)
               .forEach(async function(btn){
               	  const match = btn.id.match(/main-hlBtn-(.........)/)  
                  await pdfSleep(5000) //Maybe someone is moving blocks or undo                  
                  if(match){
                    if(!existBlockUid(blockString(match[1])))
                    	window.roamAlphaAPI.deleteBlock({"block": {"uid": match[1]}})
                  }
                });                      
          }
        }
	});
  });
});
///////////////Wait for roam to fully load then observe
var roamArticle;
var roamArticleReady = setInterval(() => {
    if(!document.querySelector('.roam-app')) return;
  	roamArticle = document.querySelector('.roam-app')   
  	hlDeletionObserver.observe(roamArticle, {
      childList: true,
      subtree: true
    });
    clearInterval(roamArticleReady);
  }, 1000);
/*************Look for Highlight Delete END***********/
/*****************************************************/

/*******************************************************/
/**************Button Activation BEGIN******************/
/*****Fixing Highlight Btns Appearance and Functions****/
function activateButtons() {
  Array.from(document.getElementsByTagName('button'))
    .filter(isInactiveHighlightBtn)
  	.forEach(btn => { 
        const btnBlockUid = getUidOfContainingBlock(btn);
        const hlBlockUid = followRef(btnBlockUid);      
        const pdfInfo = getPdfInfoFromHighlight(hlBlockUid);   
        if(pdfInfo){
          const btnBlock = addBreadcrumb(btn, pdfInfo.uid);
          const newUrl = encodePdfUrl(pdfInfo.url);
          //is this MainHilight or ref? could i locate the url?
          if(btnBlockUid == hlBlockUid && pdfInfo.url){           
            handleMainBtns(btn, btnBlock, newUrl, getSingleHighlight(hlBlockUid));
          } else { //Referenced highlights   
            handleRefBtns(btn, btnBlock, newUrl, btnBlockUid, hlBlockUid);       
          }
        }
    })
	Array.from(document.getElementsByTagName('button'))
	.filter(isInactiveSortBtn)
	.forEach(btn => {
		const sortBtnBlockUid = getUidOfContainingBlock(btn);
       	btn.classList.add('btn-sort-highlight', 'btn-pdf-activated');
		const pdfUid = parentBlockUid(sortBtnBlockUid)
		const match = blockString(pdfUid).match(/\{{pdf:\s(.*)}}/);
		if(match[1]){		
			const pdfUrl = match[1];
			var highlights = getAllHighlights(pdfUrl, pdfUid, true)
			highlights.sort(function(a, b){
                if(a.position.pageNumber < b.position.pageNumber)
                    return -1
                if(a.position.pageNumber > b.position.pageNumber)
                    return +1	
                if(a.position.boundingRect.x2 < b.position.boundingRect.x1)
                    return -1
                if(a.position.boundingRect.y1 < b.position.boundingRect.y1)	
                    return -1
                return +1
            });
          	var cnt = 0
            btn.onclick = () => 
				highlights.map(function(item){createChildBlock(sortBtnBlockUid, cnt++, "(("+item.blockRef+"))",createUid());})

		}
	})
}


/////////////////////////////////////////////////////////
///////////////Portal to the Data Page //////////////////
/////////////////////////////////////////////////////////
///////////////From highlight => Data page => Retrieve PDF url and uid.
function getPdfInfoFromHighlight(hlBlockUid){
  var match = blockString(hlBlockUid).match(/\[📑]\(\(\((.........)\)\)\)/);
  if(!match[1]) return null ;
  const pdfUid = match[1];
  match = blockString(pdfUid).match(/\{{pdf:\s(.*)}}/);
  if(!match[1]) return null;
  const pdfUrl = match[1];
  return {url : pdfUrl, uid : pdfUid};
}

///////////////From highlight => Row of the data table => Highlight coordinates
function getSingleHighlight(hlBlockUid){
  const hlDataRowUid = getHighlightDataAddress(hlBlockUid);
  const hlDataRow = queryAllTxtInChildren(hlDataRowUid);
  if(hlDataRow.length === 0) return null;
  return getHighlight(hlDataRow[0][0]);
}

///////////////From button's text jump to the corresponding data table row
function getHighlightDataAddress(hlBlockUid){
  const match = blockString(hlBlockUid).match(/{{\d+:\s*(.........)}}/);  
  if (!match) return null;
  return match[1]
}

///////////////PDF URL address is the first block in the data page
function getPdfSrcUid(pdfDataPageUid){
	return getNthChildUid(pdfDataPageUid, 0);
}

///////////////PDF UID address is the second block in the data page
function getPdfBlockUid(pdfDataPageUid){
	return getNthChildUid(pdfDataPageUid, 1);
}

/////////////////////////////////////////////////////////
//////////////Gather Buttons Information ////////////////
/////////////////////////////////////////////////////////
///////////////Are these highlight buttons?
function isRoamBtn(btn){
	return btn.classList.contains('block-ref-count-button')
  		|| btn.classList.contains('bp3-minimal')
}

function isInactive(btn){
	return !btn.classList.contains('btn-pdf-activated')
		&& !btn.classList.contains('pdf-ctrl');
}

function isHighlightBtn(btn){
  return !isRoamBtn(btn)
		 && btn.innerText.match(/^\d+$/)
}

function isSortBtn(btn){
	return !isRoamBtn(btn)
		   && btn.innerText.match(new RegExp(pdfParams.sortBtnText))
}

function isInactiveSortBtn(btn) {
	return isSortBtn(btn)
		&& isInactive(btn) 
}

function isInactiveHighlightBtn(btn) {
	return isHighlightBtn(btn)
		&& isInactive(btn) 
}

///////////////Get the Original Highlight
///////////////Where am I? Main Hilight or Reference?
function followRef(ref) {
  const res = blockString(ref);  
  if (!res) return ref;
  if (res.indexOf(pdfChar) != -1) return ref;
  const refMatch = res.match(/\(\((.........)\)\)/);
  return refMatch && res === refMatch[0] ? refMatch[1] : ref;
}

function getIframeSrc(text){
  const match = text.match(/\[.*\]\((.*)\)/);
  return match ? match[1] : null;
}

function getHighlightsFromTable(uid, sendBlockRefs) {
  const hls = queryAllTxtInChildren(uid)[0][0].children;  
  return hls.map(function(x) {return getHighlight(x, sendBlockRefs);}).filter(hl => hl != null);
}

function getTextFromNestedNodes(node, texts) {
  if (node.string) texts.push(node.string)
  if (node.children)
    node.children.forEach(child => getTextFromNestedNodes(child, texts))
}

function getHighlight(hl, sendBlockRefs) { //the column order is: (hlUid, hlPos, hlTxt)
	const position = JSON.parse(hl.children[0].string);
	const hlText = hl.children[0].children[0].string;  
	if(sendBlockRefs){
		const blockRef = hl.string 
		return { blockRef, content: { text: hlText }, position };
	}	
	return { content: { text: hlText }, position };  
}

////////////////////////////////////////////////////////////
////////Activate of the Main Highlight under the PDF////////
////////////////////////////////////////////////////////////
function handleMainBtns(btn, btnBlock, iframeSrc, highlight){
  if (highlight) {          
    btn.classList.add('btn-highlight', 'btn', 'btn-default', 'btn-pdf-activated');
    /*if(mainHlChar)
  		btn.innerText = mainHlChar;*/
  	btn.title = 'Jump to annotation';
    //Get the hlData block uid from hlText 
	//Save it in the btn id for the mutation delete observer. 
  	btn.id = 'main-hlBtn-' + blockString(getUidOfContainingBlock(btn)).match(/{{\d+:\s*(.........)}}/)[1]
    const aliasRootSpan = btnBlock.querySelector('.rm-alias').parentElement.parentElement.parentElement
	const pageRootSpan = btnBlock.querySelector('.btn-pdf-activated').parentElement
  	displaceBtn(btnBlock, "pdf-alias-main", aliasRootSpan)
	displaceBtn(btnBlock, "main-hl", pageRootSpan)
  	btn.addEventListener("click", function(){handleMainHighlightClick(btnBlock, iframeSrc, highlight)});
  }
}

////////Plant the unrooted btn after the roam block separator (at the end of a block)
function displaceBtn(btnBlock, idPerfix, btn){
  //Displace Btn
  const btnId = idPerfix + btnBlock.id;
  var oldBtn = document.getElementById(btnId)
  if(oldBtn){
    oldBtn.previousSibling.remove(); //remove the sep span
    oldBtn.remove();
  }
  btn.id = btnId    
  var lastEl = btnBlock.parentElement.querySelector('.rm-block-separator')    
  insertAfter(btn, lastEl)
  //Insert white space to the Left
  var sep = document.createElement("span")
  sep.style.marginLeft = "2px"
  btnBlock.parentElement.insertBefore(sep, btn)
}

////////Open the PDF and send the HLs to server
async function handleMainHighlightClick(btnBlock, iframeSrc, highlight){
  var iframe =  getOpenIframeElementWithSrc(iframeSrc);
  if(!iframe){ //Iframe is closed
    iframe = openPdf(btnBlock, iframeSrc);
	await pdfSleep(3000); //Let PDF loads
    iframe = getOpenIframeElementWithSrc(iframeSrc);
  }
  iframe.contentWindow.postMessage({scrollTo: highlight}, '*');
}

function getOpenIframeElementWithSrc(iframeSrc){
	return Array.from(document.getElementsByTagName('iframe'))
	            .find(iframe => iframe.src === iframeSrc);
}

////////To open: simulate shif+mouseclick on the alias
function openPdf(btnBlock, iframeSrc){
   const allAlias = btnBlock.closest('.roam-block-container').querySelectorAll('.rm-alias');
   const allAliasTxt = Array.from(allAlias).map(x => {return x.innerText})
   const pdfAliasIndex = allAliasTxt.indexOf(pdfChar);
   if(pdfAliasIndex !== -1) 
	   pdfAlias = allAlias[pdfAliasIndex];
   else 
	   return null;
   pdfAlias.dispatchEvent(new MouseEvent('click', {
                                           view: window, 
                                           bubbles: true, 
                                           cancelable: true, 
                                           buttons: 1, 
                                           shiftKey: true
                                         }));
  //Waiting for iframe to load 
  var iframeReady = setInterval(() => {
    if(!getOpenIframeElementWithSrc(iframeSrc)) return;
    clearInterval(iframeReady);
  }, 500);
}

////////////////////////////////////////////////////////////
//////////Activation of a Referenced Highlight /////////////
////////////////////////////////////////////////////////////
function handleRefBtns(btn, btnBlock, iframeSrc, btnBlockUid, hlBlockUid){
  btn.remove();
  const pdfAliasPerfix = "pdf-alias-ref" 
  const pdfAliasId = pdfAliasPerfix + btnBlock.id;
  detachPdfAlias(btnBlock, pdfAliasPerfix, "pdf-alias-clickable");
  replaceCtrlBtns(btnBlock, btnBlockUid, hlBlockUid, pdfAliasId, iframeSrc);
}

////////////////////Breadcrumb Addition////////////////////
////////////////////Breadcrumb Placement
var pdf2attr = {}
function addBreadcrumb(btn, pdfUid){
  const btnBlock = btn.closest(".rm-block__input");
  if(!pdf2attr[pdfUid]) pdf2attr[pdfUid] = findPDFAttribute(pdfUid, pdfParams.breadCrumbAttribute)
  btnBlock.firstChild.setAttribute("title", pdf2attr[pdfUid] + "/Pg" + btn.innerText);  
  btnBlock.firstChild.classList.add("breadCrumb");
  return btnBlock;
}
////////////////////Search the sub-tree of HL/PDF's 
////////////////////shared parents for the meta info
function findPDFAttribute(pdfUid, attribute){
  let gParentRef;
  if(pdfParams.outputHighlighAt === 'cousin')
  	gParentRef = parentBlockUid(parentBlockUid(pdfUid));
  else //child mode
    gParentRef = parentBlockUid(pdfUid);
  
 let ancestorrule=`[ 
                   [ (ancestor ?b ?a) 
                        [?a :block/children ?b] ] 
                   [ (ancestor ?b ?a) 
                        [?parent :block/children ?b ] 
                        (ancestor ?parent ?a) ] ] ]`;
  
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?block [:block/string])
	  :in $ %
      :where
          [?block :block/string ?attr]
          [(clojure.string/starts-with? ?attr \"${attribute}\")]
		  (ancestor ?block ?gblock)
	   	  [?gblock :block/uid \"${gParentRef}\"]]`, ancestorrule)  
   if(!res.length) return null 
   const attrString = res[0][0].string
   return attrString.substring(attrString.indexOf(attribute) + attribute.length + 2)
}

///////////////////Main Button Replacement//////////////////
function replaceCtrlBtns(btnBlock, btnBlockUid, hlBlockUid, pdfAliasId, iframeSrc){
  if(btnBlock.previousSibling.classList.contains("pdf-ctrl")) return null;
  let btnRepText = null, btnRepAlias = null, btnAnnotation = null;
  if(pdfParams.textChar !== ''){
    btnRepText = createCtrlBtn(btnBlock, 'btn-rep-text', pdfParams.textChar, 'Replace with text');
    btnRepText.addEventListener("click", function(e){
      replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, 1, pdfAliasId)});
  }
  if(pdfParams.aliasChar !== ''){
    btnRepAlias = createCtrlBtn(btnBlock, 'btn-rep-alias', pdfParams.aliasChar, 'Replace with alias');
  	btnRepAlias.addEventListener("click", function(){
      replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, 0, pdfAliasId)});
  }
  
  if(pdfParams.refHlChar !== ''){
    btnAnnotation = createCtrlBtn(btnBlock, 'btn-annotation', pdfParams.refHlChar, 'Jump to annotation')
    btnAnnotation.addEventListener("click", function(){
      jumpToAnnotation(btnBlock, hlBlockUid, iframeSrc)});
  }
}  

function createCtrlBtn(btnBlock, cssClass, text, hoverTxt){
    const newBtn = document.createElement('button');
    newBtn.classList.add(cssClass, 'btn', 'btn-default', "pdf-ctrl");
	newBtn.innerText = text;
    newBtn.title = hoverTxt;
	displaceBtn(btnBlock, cssClass, newBtn)
    return newBtn;
}


///////////////////PDF Alias Insertion///////////////////
function detachPdfAlias(btnBlock, pdfAliasPerfix, clickablePerfix){
  var clickable = btnBlock.querySelector(".rm-alias");
  clickable.id = clickablePerfix + btnBlock.id;
  clickable.addEventListener('click', async function(e) {
    if(e.shiftKey){
      await pdfSleep(200);      
      const closeButton = document.getElementById("roam-right-sidebar-content").querySelector("span.bp3-icon-cross");
	  closeButton.dispatchEvent( new MouseEvent('click', { view: window, bubbles: true, cancelable: true, buttons: 1 }) );
   }
  });
  const aliasRootSpan = clickable.parentElement.parentElement.parentElement  
  displaceBtn(btnBlock, pdfAliasPerfix, aliasRootSpan)  
}  


///////////////////Main Button Onclick//////////////////
///////////////HL Reference Replacement: As Text or Alias
function replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, asText, pdfAliasId) {
  const hl = blockString(hlBlockUid);
  const hlTextStartIndex = hl.indexOf(")))") + 3;
  const hlText = hl.substring(hlTextStartIndex);
  const hlAlias = hlText + "[*](((" + hlBlockUid + ")))";
  if(asText)
  	window.roamAlphaAPI.updateBlock({"block":{"uid": btnBlockUid,"string": hlText}});
  else
	window.roamAlphaAPI.updateBlock({"block":{"uid": btnBlockUid,"string": hlAlias}});
  btnRepText?.remove();
  btnRepAlias?.remove();
  btnAnnotation?.remove();
  document.getElementById(pdfAliasId)?.remove();
}


///////////////Jump to Annotation Button
async function jumpToAnnotation(btnBlock, hlBlockUid, iframeSrc) {
  var iframe =  getOpenIframeElementWithSrc(iframeSrc);
  if(!iframe){ //Iframe is closed
	iframe = openPdf(btnBlock, iframeSrc); 
	await pdfSleep(5000); //Let PDF loads
    iframe = getOpenIframeElementWithSrc(iframeSrc);
  } 
  iframe.contentWindow.postMessage({scrollTo: getSingleHighlight(hlBlockUid)}, '*');
}
/***************Button Activation END*******************/
/*******************************************************/

/*******************************************************/
/************Handle New HL Received BEGIN***************/
window.addEventListener('message', handleRecievedHighlight, false);

///////////Recieve Highlight Data, Output Highlight Text, Store HL Data 
function handleRecievedHighlight(event) {
  if (!event.data.highlight) return;  
  if(event.data.highlight.position.rects.length == 0){
    event.data.highlight.position.rects[0] = event.data.highlight.position.boundingRect;
  }  
  const page = event.data.highlight.position.pageNumber;
  const hlPosition = JSON.stringify(event.data.highlight.position);
  const iframe = document.getElementById(activePdfIframeId);
  const pdfBlockUid = getUidOfContainingBlock(iframe);
  let hlContent; 
  const pdfAlias = `[${pdfChar}](((${pdfBlockUid})))`;
  const hlDataUid = createUid(); 
  const hlTextUid = createUid();
  const hlBtn = `{{${page}: ${hlDataUid}}}`;
    
  if (event.data.highlight.imageUrl) {
    hlContent = `![](${event.data.highlight.imageUrl})`;   
  } else {
  	hlContent = `${event.data.highlight.content.text}`;
  }  
  writeHighlightText(pdfBlockUid, hlTextUid, hlBtn, hlContent, pdfAlias, page);
  saveHighlightData(pdfBlockUid, decodePdfUrl(iframe.src), hlDataUid , hlTextUid, hlPosition, hlContent);
} 

///////////For the Cousin Output Mode: Find the Uncle of the PDF Block. 
function getUncleBlock(pdfBlockUid){  
  const pdfParentBlockUid = parentBlockUid(pdfBlockUid);  
  const gParentBlockUid = parentBlockUid(pdfParentBlockUid);
  var dictUid2Ord = {};
  var dictOrd2Uid = {};
  if(!gParentBlockUid) return null;
  const mainBlocksUid = allChildrenUid(gParentBlockUid);  
  mainBlocksUid[0][0].children.map(child => {
    dictUid2Ord[child.uid] = child.order;
    dictOrd2Uid[child.order] = child.uid;
  });      
  //Single assumption: PDF & Highlights are assumed to be siblings.
  var hlParentBlockUid =  dictOrd2Uid[dictUid2Ord[pdfParentBlockUid]+1];  
  if(!hlParentBlockUid){
    hlParentBlockUid = createUid()
    createChildBlock(gParentBlockUid, dictUid2Ord[pdfParentBlockUid]+1, "**Highlights**", hlParentBlockUid);
  }    
  return hlParentBlockUid;
}

////////////Write the Highlight Text Using the Given Format
var pdf2citeKey = {}  
function writeHighlightText(pdfBlockUid, hlTextUid, hlBtn, hlContent, pdfAlias, page){  
  let hlParentBlockUid;
  if(pdfParams.outputHighlighAt === 'cousin'){
    hlParentBlockUid = getUncleBlock(pdfBlockUid);
    if(!hlParentBlockUid) hlParentBlockUid = pdfBlockUid; //there is no gparent, write hl as a child
  } else { //outputHighlighAt ==='child'
    hlParentBlockUid = pdfBlockUid
  }    
  const perfix = pdfParams.blockQ ? '[[>]]' : '';      
  var Citekey = '';
  if(pdfParams.citationFormat !== ''){
    if(!pdf2citeKey[pdfBlockUid]) {
    	pdf2citeKey[pdfBlockUid] = findPDFAttribute(pdfBlockUid, "Citekey")  
    }
    Citekey = pdf2citeKey[pdfBlockUid]
  } 
  const citation = eval('`'+pdfParams.citationFormat+'`').replace(/\s+/g, '');
  const hlText = perfix+" "+hlBtn+" "+pdfAlias+" "+hlContent+" "+citation;
  const ord = pdfParams.appendHighlight ? 9999999 : 0;
  createChildBlock(hlParentBlockUid, ord, hlText, hlTextUid);

  if(pdfParams.copyBlockRef)
    navigator.clipboard.writeText("(("+hlTextUid+"))");
  else
    navigator.clipboard.writeText(hlContent);
}

///////////Save Annotations in the PDF Data Page in a Table
function saveHighlightData(pdfUid, pdfUrl, hlDataUid, hlTextUid, hlPosition, hlContent){
	const dataTableUid = getDataTableUid(pdfUrl, pdfUid);
	createChildBlock(dataTableUid, 0, hlTextUid, hlDataUid);
	const posUid = createUid();
	createChildBlock(hlDataUid, 0, hlPosition, posUid);
	createChildBlock(posUid, 0, hlContent, createUid());
}

/************Handle New HL Received END****************/
/*******************************************************/

/*******************************************************/
/**********Render PDF and Highlights BEGIN**************/
/////////////////////Find pdf iframe being highlighted
var allPdfIframes = []; //History of opened pdf on page
var activePdfIframeId = null; //Last active pdf iframe.id

window.addEventListener('blur', function() {
  var iframeIds = allPdfIframes.map(function(item){return item.id;});
  activePdfIframe = allPdfIframes.find(x => x === document.activeElement);
  activePdfIframeId = activePdfIframe?.id;  	
});

/////////////////////Show the PDF through the Server
function renderPdf(iframe) {
  iframe.classList.add('pdf-activated');
  iframe.src = encodePdfUrl(iframe.src);
  iframe.style.minWidth = `${pdfParams.pdfMinWidth}px`;
  iframe.style.minHeight = `${pdfParams.pdfMinHeight}px`;
}


/////////////////////Send Old Saved Highlights to Server to Render
function sendHighlights(iframe, originalPdfUrl, pdfBlockUid) {    
  const highlights = getAllHighlights(originalPdfUrl, pdfBlockUid, false);
  window.setTimeout( // give it 5 seconds to load
    () => iframe.contentWindow.postMessage({highlights}, '*'), 2000);
}

/////////////////////From PDF URL => Data Page => Retrieve Data
function getAllHighlights(pdfUrl, pdfUid, sendBlockRefs){  
  const dataTableUid = getDataTableUid(pdfUrl, pdfUid);
  return getHighlightsFromTable(dataTableUid, sendBlockRefs);
}

function getDataTableUid(pdfUrl, pdfUid){
	const pdfDataPageTitle = getDataPageTitle(pdfUrl);
	var pdfDataPageUid = getPageUid(pdfDataPageTitle); 
	if(!pdfDataPageUid) //If this is the first time uploading the pdf
		pdfDataPageUid = createDataPage(pdfDataPageTitle, pdfUrl, pdfUid);	
	return getNthChildUid(pdfDataPageUid, 2);
}

function getDataPageTitle(pdfUrl){
	return 'roam/js/pdf/data/' + hashCode(pdfUrl);
}
/////////////////////Initialize a Data Page. Format is:
/////////////////////pdfPageTitle
/////////////////////////pdfUrl
/////////////////////////pdfUid
/////////////////////////{{table}}
function createDataPage(pdfPageTitle, pdfUrl, pdfUid){
	const pdfDataPageUid = createPage(pdfPageTitle);
	createChildBlock(pdfDataPageUid, 0, pdfUrl, createUid());
	createChildBlock(pdfDataPageUid, 1, pdfUid, createUid()); 
	createChildBlock(pdfDataPageUid, 2, "{{table}}", createUid());
	return pdfDataPageUid;
}
/***********Render PDF and Highlights END***************/
/*******************************************************/

/*******************************************************/
/*********Helper API Wrapper Functions BEGIN************/
///////////////Back-End///////////////
function existBlockUid(blockUid){
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?block [:block/uid])
      :where
	   	  [?block :block/uid \"${blockUid}\"]]`)
  return res.length ? blockUid : null
}

function parentBlockUid(blockUid){
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?parent [:block/uid])
      :where
          [?parent :block/children ?block]
	   	  [?block :block/uid \"${blockUid}\"]]`)  
  return res.length ? res[0][0].uid : null
}

function blockString(blockUid){
  return window.roamAlphaAPI.q(
    `[:find (pull ?block [:block/string])
	  :where [?block :block/uid \"${blockUid}\"]]`)[0][0].string
}

function allChildrenUid(blockUid){
  return window.roamAlphaAPI.q(
    `[:find (pull ?parent [* {:block/children [:block/uid :block/order]}])
    :where
		[?parent :block/uid \"${blockUid}\"]]`)
}

function queryAllTxtInChildren(blockUid){
  return window.roamAlphaAPI.q(`[
    :find (pull ?block [
        :block/string
        :block/children
        {:block/children ...}
    ])
    :where [?block :block/uid \"${blockUid}\"]]`)
}

function getPageUid(pageTitle){
	const res = window.roamAlphaAPI.q(
    `[:find (pull ?page [:block/uid])
	  :where [?page :node/title \"${pageTitle}\"]]`)
    return res.length ? res[0][0].uid : null
}

///////////////Front-End///////////////
function getUidOfContainingBlock(el) {
  return el.closest('.rm-block__input').id.slice(-9)
}

function insertAfter(newEl, anchor){
  anchor.parentElement.insertBefore(newEl, anchor.nextSibling)	  
}

function encodePdfUrl(url){
  return serverPerfix + encodeURI(url);
}

function decodePdfUrl(url){
  return decodeURI(url).substring(serverPerfix.length);
}

function getNthChildUid(parentUid, order){
  const allChildren = allChildrenUid(parentUid)[0][0].children;
  const childrenOrder = allChildren.map(function(child){return child.order;});
  const index = childrenOrder.findIndex(el => el === order);
  return index !== -1 ? allChildren[index].uid : null;
}

pdfSleep = m => new Promise(r => setTimeout(r, m))

function createPage(pageTitle){  
  var pageUid = createUid()
  const status = window
    .roamAlphaAPI
    .createPage(
    {"page":
     {"title": pageTitle, "uid": pageUid}})
  return status ? pageUid : null
}



function hashCode(str){
	var hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function createChildBlock(parentUid, order, childString, childUid){
  return window.roamAlphaAPI.createBlock(
    {
      "location": {"parent-uid": parentUid, "order": order}, 
      "block": {"string": childString, "uid": childUid}
    })
}

function createUid(){
  let nanoid=(t=21)=>{
    let e="",r=crypto.getRandomValues(new Uint8Array(t));for(;t--;){
      let n=63&r[t];e+=n<36?n.toString(36):n<62?(n-26).toString(36).toUpperCase():n<63?"_":"-"
    }
    return e
  };
  return nanoid(9);
}
/*********Helper API Wrapper Functions END************/
