// ==UserScript==
// @name         Enhanced-PDF Extension for Roam Research
// @author       hungriesthippo <https://github.com/hungriesthippo> & CCC <https://github.com/c3founder>
// @require 	 -
// @version      0.9
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


function initPdf() {
  Array.from(document.getElementsByTagName('iframe')).forEach(iframe => {
    if (!iframe.classList.contains('pdf-activated')) {
      try {
        if (new URL(iframe.src).pathname.endsWith('.pdf')) {
          const originalPdfUrl = iframe.src; //the permanent pdfId
          iframe.id = "pdf-" + iframe.closest('.roam-block').id; //window level pdfId
          const pdfBlockUid = getUidOfContainingBlock(iframe); //for click purpose
          allPdfIframes.push(iframe); //save for interaction
          renderPdf(iframe); //render pdf through the server 
          sendHighlights(iframe, originalPdfUrl, pdfBlockUid);
        }
      } catch { } // some iframes have invalid src
    }
    if (iframe.src.startsWith(serverPerfix)) {
      let sideBarOpen = document.getElementById("right-sidebar").childElementCount - 1;
      adjustPdfIframe(iframe, sideBarOpen);
    }
  })
  activateButtons();
}
///////////////Responsive PDF Iframe 
function adjustPdfIframe(iframe, sideBarOpen) {
  const reactParent = iframe.closest('.react-resizable')
  const reactHandle = reactParent.querySelector(".react-resizable-handle")
  const hoverParent = iframe.closest('.hoverparent')
  reactHandle.style.display = 'none';
  reactParent.style.width = '100%';
  reactParent.style.height = '100%';
  if (sideBarOpen) {
    hoverParent.style.width = '100%';
    hoverParent.style.height = '100%';
  } else {
    const page = document.querySelector('.roam-log-page')
    hoverParent.style.width = window.getComputedStyle(page).getPropertyValue('width'); 
    hoverParent.style.height = `${pdfParams.pdfStaticHeight}px`
  }
}
/************************Main END***********************/
/*******************************************************/

/*******************************************************/
/*************Look for Highlight Delete BEGIN***********/
let hlDeletionObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.removedNodes.forEach(node => {
      if (typeof (node.classList) !== 'undefined') {
        if (node.classList.contains("roam-block-container")) { //if a block is deleted
          handleHighlightDelete(node)
          handlePdfDelete(node)
        }
      }
    });
  });
});

function handleHighlightDelete(node) {
  Array.from(node.getElementsByTagName('button')) //if it had a button
    .filter(isHighlightBtn)
    .forEach(async function (btn) {
      const match = btn.id.match(/main-hlBtn-(.........)/)
      if (match) {
        if (existBlockUid(match[1])) {//If the data page was deleted ignore 
          await pdfSleep(3000) //Maybe someone is moving blocks or undo                  
          if (!existBlockUid(blockString(match[1]))) {
            //Delete the date row                
            const hlDataRowUid = match[1];
            const hlDataRow = queryAllTxtInChildren(hlDataRowUid);
            const toDeleteHighlight = getHighlight(hlDataRow[0][0]);
            const dataTableUid = parentBlockUid(hlDataRowUid);
            window.roamAlphaAPI.deleteBlock({ "block": { "uid": hlDataRowUid } });
            //Delete the hl on pdf (send message to render)            
            const dataPageUid = parentBlockUid(dataTableUid);
            const pdfUrl = encodePdfUrl(blockString(getNthChildUid(dataPageUid, 0)));
            Array.from(document.getElementsByTagName('iframe'))
              .filter(x => x.src === pdfUrl)
              .forEach(iframe => {
                iframe.contentWindow.postMessage({ deleted: toDeleteHighlight }, '*');
              });
          }
        }
      }
    });
}

function handlePdfDelete(node) {
  Array.from(node.getElementsByTagName('iframe'))
    .filter(x => { return x.src.indexOf(serverPerfix) !== -1; })
    .forEach(async function (iframe) {
      await pdfSleep(1000) //Maybe someone is moving blocks or undo
      const pdfUid = iframe.id.slice(-9)
      if (!existBlockUid(pdfUid)) { //pdf block deleted
        const pdfUrl = decodePdfUrl(iframe.src)
        const pdfDataPageTitle = getDataPageTitle(pdfUrl);
        const pdfDataPageUid = getPageUid(pdfDataPageTitle);
        if (pdfDataPageUid) { //If the data page exists
          const tableUid = getNthChildUid(pdfDataPageUid, 2);
          const res = allChildrenInfo(tableUid)[0][0];
          window.roamAlphaAPI.deletePage({ page: { uid: pdfDataPageUid } });
          res.children.map(async function (child) {
            //You can check their existence but seems redundent. 
            window.roamAlphaAPI.deleteBlock({ block: { uid: child.string } })
          });
        }
      }
    });
}


///////////////Wait for roam to fully load then observe
let roamArticle;
let roamArticleReady = setInterval(() => {
  if (!document.querySelector('.roam-app')) return;
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
      if (btn.closest('.rm-zoom-item'))
        btn.classList.add('btn-main-annotation', 'btn', 'btn-default', 'btn-pdf-activated');
      const btnBlockUid = getUidOfContainingBlock(btn);
      const hlBlockUid = followRef(btnBlockUid);
      const pdfInfo = getPdfInfoFromHighlight(hlBlockUid);
      if (pdfInfo) {
        const btnBlock = btn.closest(".rm-block__input");
        const page = btn.innerText;
        addBreadcrumb(btnBlock, page, pdfInfo.uid);
        const newUrl = encodePdfUrl(pdfInfo.url);
        //is this MainHilight or ref? could i locate the url?
        if (btnBlockUid == hlBlockUid && pdfInfo.url) {
          handleMainBtns(btn, page, btnBlock, newUrl, hlBlockUid, getSingleHighlight(hlBlockUid));
        } else { //Referenced highlights   
          btn.remove();
          handleRefBtns(page, btnBlock, newUrl, btnBlockUid, hlBlockUid);
        }
      }
    })
  activateSortButtons();
}

function activateSortButtons() {
  Array.from(document.getElementsByTagName('button'))
    .filter(isInactiveSortBtn)
    .forEach(btn => {
      const sortBtnBlockUid = getUidOfContainingBlock(btn);
      btn.classList.add('btn-sort-highlight', 'btn-pdf-activated');
      const pdfUid = parentBlockUid(sortBtnBlockUid)
      const match = blockString(pdfUid).match(/\{{pdf:\s(.*)}}/);
      if (match[1]) {
        const pdfUrl = match[1];
        let highlights = getAllHighlights(pdfUrl, pdfUid)
        highlights.sort(function (a, b) {
          if (a.position.pageNumber < b.position.pageNumber)
            return -1
          if (a.position.pageNumber > b.position.pageNumber)
            return +1
          if (a.position.boundingRect.x2 < b.position.boundingRect.x1)
            return -1
          if (b.position.boundingRect.x2 < a.position.boundingRect.x1)
            return +1
          if (a.position.boundingRect.y1 < b.position.boundingRect.y1)
            return -1
          return +1
        });
        let cnt = 0
        btn.onclick = () =>
          highlights.map(function (item) { createChildBlock(sortBtnBlockUid, cnt++, "((" + item.id + "))", createUid()); })

      }
    })
}

/////////////////////////////////////////////////////////
///////////////Portal to the Data Page //////////////////
/////////////////////////////////////////////////////////
///////////////From highlight => Data page => Retrieve PDF url and uid.
function getPdfInfoFromHighlight(hlBlockUid) {
  let match = blockString(hlBlockUid).match(/\[📑]\(\(\((.........)\)\)\)/);
  if (!match[1]) return null;
  const pdfUid = match[1];
  match = blockString(pdfUid).match(/\{{pdf:\s(.*)}}/);
  if (!match[1]) return null;
  const pdfUrl = match[1];
  return { url: pdfUrl, uid: pdfUid };
}

///////////////From highlight => Row of the data table => Highlight coordinates
function getSingleHighlight(hlBlockUid) {
  const hlDataRowUid = getHighlightDataAddress(hlBlockUid);
  const hlDataRow = queryAllTxtInChildren(hlDataRowUid);
  if (hlDataRow.length === 0) return null;
  return getHighlight(hlDataRow[0][0]);
}

///////////////From button's text jump to the corresponding data table row
function getHighlightDataAddress(hlBlockUid) {
  const match = blockString(hlBlockUid).match(/{{\d+:\s*(.........)}}/);
  if (!match) return null;
  return match[1]
}

///////////////PDF URL address is the first block in the data page
function getPdfSrcUid(pdfDataPageUid) {
  return getNthChildUid(pdfDataPageUid, 0);
}

///////////////PDF UID address is the second block in the data page
function getPdfBlockUid(pdfDataPageUid) {
  return getNthChildUid(pdfDataPageUid, 1);
}

/////////////////////////////////////////////////////////
//////////////Gather Buttons Information ////////////////
/////////////////////////////////////////////////////////
///////////////Are these highlight buttons?
function isRoamBtn(btn) {
  return btn.classList.contains('block-ref-count-button')
    || btn.classList.contains('bp3-minimal')
}

function isInactive(btn) {
  return !btn.classList.contains('btn-pdf-activated');
  //&& !btn.classList.contains('pdf-ctrl');
}

function isHighlightBtn(btn) {
  return !isRoamBtn(btn)
    && btn.innerText.match(/^\d+$/)
}

function isSortBtn(btn) {
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
  const refMatch = res.match(/\s*\(\((.........)\)\)\s*/);
  return refMatch && res === refMatch[0] ? refMatch[1] : ref;
}

function getHighlightsFromTable(uid) {
  const hls = queryAllTxtInChildren(uid)[0][0].children;
  return hls.map(function (x) { return getHighlight(x); }).filter(hl => hl != null);
}

function getTextFromNestedNodes(node, texts) {
  if (node.string) texts.push(node.string)
  if (node.children)
    node.children.forEach(child => getTextFromNestedNodes(child, texts))
}

function getHighlight(hl) { //the column order is: (hlUid, hlInfo(pos, color), hlTxt)  
  //Extracting Text
  const hlText = hl.children[0].children[0].string;
  //Extracting Info = (position, color)
  const hlInfo = JSON.parse(hl.children[0].string);
  let position, color;
  if (typeof (hlInfo.position) === 'undefined') {//if older version highlight
    position = JSON.parse(hl.children[0].string);
    color = 0;
  } else {
    position = hlInfo.position;
    color = hlInfo.color;
  }
  //Extracting Id
  const id = hl.string
  return { id, content: { text: hlText }, position, color };
}

////////////////////////////////////////////////////////////
////////Activate of the Main Highlight under the PDF////////
////////////////////////////////////////////////////////////
function handleMainBtns(btn, pageNumber, btnBlock, iframeSrc, hlBlockUid, highlight) {
  if (highlight) {
    const btnId = blockString(hlBlockUid).match(/{{\d+:\s*(.........)}}/)[1];
    btn.classList.add('btn-main-annotation', 'btn', 'btn-default', 'btn-pdf-activated');
    btn.id = 'main-hlBtn-' + btnId;
    btn.addEventListener("click", function (e) { handleMainHighlightClick(btnBlock, iframeSrc, highlight) });
  }
}

////////Plant the unrooted span after the roam block separator (at the end of a block)
function displaceBtn(btnBlock, rootId, root) {
  //Displace root 
  let oldBtn = document.getElementById(rootId)
  if (oldBtn) {
    oldBtn.previousSibling.remove(); //remove the sep span
    oldBtn.remove();
  }
  root.id = rootId;
  root.classList.add('span-pdf');
  let lastEl = btnBlock.parentElement.querySelector('.rm-block-separator')
  insertAfter(root, lastEl)
  //Insert white space to the Left
  let sep = document.createElement("span")
  sep.classList.add('span-pdf');
  sep.style.marginLeft = "2px"
  btnBlock.parentElement.insertBefore(sep, root)
}

////////Open the PDF and send the HLs to server
async function handleMainHighlightClick(btnBlock, iframeSrc, highlight) {
  let iframe = getOpenIframeElementWithSrc(iframeSrc);
  if (!iframe) { //Iframe is closed
    iframe = openPdf(btnBlock, iframeSrc);
    await pdfSleep(3000); //Let PDF loads
    iframe = getOpenIframeElementWithSrc(iframeSrc);
  }
  iframe.contentWindow.postMessage({ scrollTo: highlight }, '*');
}

function getOpenIframeElementWithSrc(iframeSrc) {
  return Array.from(document.getElementsByTagName('iframe'))
    .find(iframe => iframe.src === iframeSrc);
}

////////To open: simulate shif+mouseclick on the alias
function openPdf(btnBlock, iframeSrc) {
  const allAlias = btnBlock.closest('.roam-block-container').querySelectorAll('.rm-alias');
  const allAliasTxt = Array.from(allAlias).map(x => { return x.innerText })
  const pdfAliasIndex = allAliasTxt.indexOf(pdfChar);
  if (pdfAliasIndex !== -1)
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
  let iframeReady = setInterval(() => {
    if (!getOpenIframeElementWithSrc(iframeSrc)) return;
    clearInterval(iframeReady);
  }, 500);
}

////////////////////////////////////////////////////////////
//////////Activation of a Referenced Highlight /////////////
////////////////////////////////////////////////////////////
function handleRefBtns(pageNumber, btnBlock, iframeSrc, btnBlockUid, hlBlockUid) {
  const pdfAliasId = 'pdf-alias-ref-' + btnBlock.id;
  detachPdfAlias(btnBlock, pdfAliasId);
  replaceCtrlBtns(btnBlock, btnBlockUid, hlBlockUid, pdfAliasId, iframeSrc, pageNumber);
}

////////////////////Breadcrumb Addition////////////////////
////////////////////Breadcrumb Placement
let pdf2attr = {}
function addBreadcrumb(btnBlock, pageNumber, pdfUid) {
  if (!pdf2attr[pdfUid]) pdf2attr[pdfUid] = findPDFAttribute(pdfUid, pdfParams.breadCrumbAttribute)
  btnBlock.firstChild.setAttribute("title", pdf2attr[pdfUid] + "/Pg" + pageNumber);
  btnBlock.firstChild.classList.add("breadCrumb");
}
////////////////////Search the sub-tree of HL/PDF's 
////////////////////shared parents for the meta info
function findPDFAttribute(pdfUid, attribute) {
  let gParentRef;
  if (pdfParams.outputHighlighAt === 'cousin'){
    gParentRef = parentBlockUid(parentBlockUid(pdfUid));
    if (!gParentRef) gParentRef = pdfUid;
  }    
  else //child mode
    gParentRef = pdfUid; //parentBlockUid(pdfUid);

  let ancestorrule = `[ 
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
          [(clojure.string/starts-with? ?attr \"${attribute}:\")]
          (ancestor ?block ?gblock)
             [?gblock :block/uid \"${gParentRef}\"]]`, ancestorrule)
  if (!res.length) return '';
  // match attribute: or attribute::
  const attrMatch = new RegExp(`^${attribute}::?\\s*(.*)$`);
  return res[0][0].string.match(attrMatch)[1];
}

///////////////////Main Button Replacement//////////////////
function replaceCtrlBtns(btnBlock, btnBlockUid, hlBlockUid, pdfAliasId, iframeSrc, pageNumber) {
  if (btnBlock.previousSibling.classList.contains('btn-pdf-activated')) return null;
  let btnRepText = null, btnRepAlias = null, btnAnnotation = null;
  let cssClass;
  if (pdfParams.textChar !== '') {
    cssClass = 'btn-rep-text';
    btnRepText = createCtrlBtn(btnBlock, cssClass, cssClass + "-" + btnBlock.id, pdfParams.textChar, 'Replace with text');
    btnRepText.addEventListener("click", function (e) {
      replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, 1, pdfAliasId)
    });
  }
  if (pdfParams.aliasChar !== '') {
    cssClass = 'btn-rep-alias';
    btnRepAlias = createCtrlBtn(btnBlock, cssClass, cssClass + "-" + btnBlock.id, pdfParams.aliasChar, 'Replace with alias');
    btnRepAlias.addEventListener("click", function () {
      replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, 0, pdfAliasId)
    });
  }

  cssClass = 'btn-ref-annotation';
  btnAnnotation = createCtrlBtn(btnBlock, cssClass, cssClass + "-" + btnBlock.id, pageNumber, 'Jump to annotation')
  btnAnnotation.addEventListener("click", function () {
    jumpToAnnotation(btnBlock, hlBlockUid, iframeSrc)
  });
}

function createCtrlBtn(btnBlock, cssClass, newBtnId, btnText, hoverTxt) {
  const newBtn = document.createElement('button');
  newBtn.classList.add(cssClass, 'btn', 'btn-default', 'btn-pdf-activated');
  newBtn.innerText = btnText;
  newBtn.title = hoverTxt;
  displaceBtn(btnBlock, newBtnId, newBtn)
  return newBtn;
}


///////////////////PDF Alias Insertion///////////////////
function detachPdfAlias(btnBlock, pdfAliasId) {
  let clickable = Array.from(btnBlock.querySelectorAll(".rm-alias"))
    .filter(x => { return x.innerText === '📑' })[0];
  const aliasRootSpan = clickable.parentElement.parentElement.parentElement
  displaceBtn(btnBlock, pdfAliasId, aliasRootSpan)
  clickable.addEventListener('click', async function (e) {
    if (e.shiftKey) {
      await pdfSleep(5000);
      const closeButton = document.getElementById("roam-right-sidebar-content").querySelector("span.bp3-icon-cross");
      closeButton.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true, buttons: 1 }));
    }
  });
}


///////////////////Main Button Onclick//////////////////
///////////////HL Reference Replacement: As Text or Alias
function replaceHl(btnRepText, btnRepAlias, btnAnnotation, btnBlockUid, hlBlockUid, asText, pdfAliasId) {
  const hl = blockString(hlBlockUid);
  const match = hl.match(/\{\{\d+:\s*.........\}\}\s*\[📑\]\(\(\(.........\)\)\)/)
  const hlText = hl.substring(0, match.index);
  const hlAlias = hlText + "[*](((" + hlBlockUid + ")))";
  if (asText)
    updateBlockString(btnBlockUid, hlText)
  else
    updateBlockString(btnBlockUid, hlAlias)

  const pdfAlias = document.getElementById(pdfAliasId)
  pdfAlias.previousSibling.remove();
  pdfAlias.remove();

  if (pdfParams.textChar !== '') {
    btnRepText.previousSibling.remove();
    btnRepText.remove();
  }
  if (pdfParams.aliasChar !== '') {
    btnRepAlias.previousSibling.remove();
    btnRepAlias.remove();
  }
  btnAnnotation.previousSibling.remove();
  btnAnnotation.remove();

}


///////////////Jump to Annotation Button
async function jumpToAnnotation(btnBlock, hlBlockUid, iframeSrc) {
  let iframe = getOpenIframeElementWithSrc(iframeSrc);
  if (!iframe) { //Iframe is closed
    iframe = openPdf(btnBlock, iframeSrc);
    await pdfSleep(7000); //Let PDF loads
    iframe = getOpenIframeElementWithSrc(iframeSrc);
  }
  iframe.contentWindow.postMessage({ scrollTo: getSingleHighlight(hlBlockUid) }, '*');
}
/***************Button Activation END*******************/
/*******************************************************/

/*******************************************************/
/************Handle New HL Received BEGIN***************/
window.addEventListener('message', handleRecievedMessage, false);

///////////Recieve Highlight Data, Output Highlight Text, Store HL Data 
function handleRecievedMessage(event) {
  switch (event.data.actionType) {
    case 'added':
      handleNewHighlight(event)
      break;
    case 'updated':
      handleUpdatedHighlight(event)
      break;
    case 'deleted':
      handleDeletedHighlight(event)
      break;
  }
}

function handleUpdatedHighlight(event) {
  const newColorNum = parseInt(event.data.highlight.color);
  if (pdfParams.addColoredHighlight && newColorNum) {
    const hlId = event.data.highlight.id;
    updateHighlightText(newColorNum, hlId);
    updateHighlightData(newColorNum, hlId);
  }
}

function updateHighlightText(newColorNum, hlId) {
  let newColorString = '';
  switch (newColorNum) {
    case 1: newColorString = "yellow"; break;
    case 2: newColorString = "red"; break;
    case 3: newColorString = "green"; break;
    case 4: newColorString = "blue"; break;
    case 5: newColorString = "purple"; break;
  }
  if (newColorString !== '') {
    let hlText = blockString(hlId);
    //Separate Perfix and Main Text
    const hasPerfix1 = hlText.match(/>(.*)/);
    const hasPerfix2 = hlText.match(/\[\[>\]\](.*)/);
    let perfix, restTxt;
    if (hasPerfix1) {
      perfix = '>';
      restTxt = hasPerfix1[1];
    } else if (hasPerfix2) {
      perfix = '[[>]]';
      restTxt = hasPerfix2[1];
    } else {
      perfix = '';
      restTxt = hlText;
    }
    const content = restTxt.match(/(.*)({{\d+:\s*.........}}\s*\[📑\]\(\(\(.........\)\)\))/);
    const isImage = restTxt.match(/.*(\!\[.*\]\(.*\))\s*{{\d+:\s*.........}}\s*\[📑\]\(\(\(.........\)\)\)/)
    const isHlTxt = restTxt.match(/.*(\^{2}.*\^{2}).*/)
    if (isImage)
      mainContent = ` ${isImage[1]}`;
    else if (isHlTxt)
      mainContent = isHlTxt[1];
    else
      mainContent = `^^${content[1]}^^`;
    const trail = content[2]
    updateBlockString(hlId, `${perfix} #h:${newColorString}${mainContent} ${trail}`);
  }
}

function updateHighlightData(newColorNum, toUpdateHlTextUid) {
  const toUpdateHlDataRowUid = getHighlightDataAddress(toUpdateHlTextUid)
  const toUpdateHlInfoUid = getNthChildUid(toUpdateHlDataRowUid, 0);
  const toUpdateHlInfoString = blockString(toUpdateHlInfoUid);
  let toUpdateHlInfo = JSON.parse(toUpdateHlInfoString)
  let hlPosition;
  if (typeof (toUpdateHlInfo.position) === 'undefined') //if older version highlight
    hlPosition = toUpdateHlInfo;
  else
    hlPosition = toUpdateHlInfo.position;
  updateBlockString(toUpdateHlInfoUid, JSON.stringify({ position: hlPosition, color: newColorNum }));
}

function handleNewHighlight(event) {
  if (event.data.highlight.position.rects.length == 0) {
    event.data.highlight.position.rects[0] = event.data.highlight.position.boundingRect;
  }
  const page = event.data.highlight.position.pageNumber;
  const hlInfo = JSON.stringify({
    position: event.data.highlight.position, color: event.data.highlight.color
  });
  const iframe = document.getElementById(activePdfIframeId);
  const pdfBlockUid = getUidOfContainingBlock(iframe);
  let hlContent;
  const pdfAlias = `[${pdfChar}](((${pdfBlockUid})))`;
  const hlDataUid = createUid();
  const hlTextUid = event.data.highlight.id;
  const hlBtn = `{{${page}: ${hlDataUid}}}`;

  if (event.data.highlight.imageUrl) {
    hlContent = `![](${event.data.highlight.imageUrl})`;
  } else {
    hlContent = `${event.data.highlight.content.text}`;
  }
  writeHighlightText(pdfBlockUid, hlTextUid, hlBtn, hlContent, pdfAlias, page);
  saveHighlightData(pdfBlockUid, decodePdfUrl(iframe.src), hlDataUid, hlTextUid, hlInfo, hlContent);
}

function handleDeletedHighlight(event) {
  const toDeleteHlTextUid = event.data.highlight.id;
  const toDeleteHlDataRowUid = getHighlightDataAddress(toDeleteHlTextUid)
  window.roamAlphaAPI.deleteBlock({ "block": { "uid": toDeleteHlTextUid } })
  window.roamAlphaAPI.deleteBlock({ "block": { "uid": toDeleteHlDataRowUid } })
}

///////////For the Cousin Output Mode: Find the Uncle of the PDF Block. 
function getUncleBlock(pdfBlockUid) {
  const pdfParentBlockUid = parentBlockUid(pdfBlockUid);
  const gParentBlockUid = parentBlockUid(pdfParentBlockUid);
  let dictUid2Ord = {};
  let dictOrd2Uid = {};
  if (!gParentBlockUid) return null;
  const mainBlocksUid = allChildrenInfo(gParentBlockUid);
  mainBlocksUid[0][0].children.map(child => {
    dictUid2Ord[child.uid] = child.order;
    dictOrd2Uid[child.order] = child.uid;
  });
  //Single assumption: PDF & Highlights are assumed to be siblings.
  let hlParentBlockUid = dictOrd2Uid[dictUid2Ord[pdfParentBlockUid] + 1];
  if (!hlParentBlockUid) {
    hlParentBlockUid = createUid()
    createChildBlock(gParentBlockUid, dictUid2Ord[pdfParentBlockUid] + 1,
      pdfParams.highlightHeading, hlParentBlockUid);
  }
  return hlParentBlockUid;
}

////////////Write the Highlight Text Using the Given Format
let pdf2citeKey = {}
let pdf2pgOffset = {}
async function writeHighlightText(pdfBlockUid, hlTextUid, hlBtn, hlContent, pdfAlias, page) {
  let hlParentBlockUid;
  //Find where to write
  if (pdfParams.outputHighlighAt === 'cousin') {
    hlParentBlockUid = getUncleBlock(pdfBlockUid);    
    await pdfSleep(100);
    if (!hlParentBlockUid) hlParentBlockUid = pdfBlockUid; //there is no gparent, write hl as a child
  } else { //outputHighlighAt ==='child'
    hlParentBlockUid = pdfBlockUid
  }
  //Make the citation
  const perfix = (pdfParams.blockQPerfix === '') ? '' : pdfParams.blockQPerfix + ' ';
  let Citekey = '';
  if (pdfParams.citationFormat !== '') {
    if (!pdf2citeKey[pdfBlockUid]) {
      pdf2citeKey[pdfBlockUid] = findPDFAttribute(pdfBlockUid, "Citekey")
    }
    if (!pdf2pgOffset[pdfBlockUid]) {
      const tempOffset = parseInt(findPDFAttribute(pdfBlockUid, "Page Offset"));
      pdf2pgOffset[pdfBlockUid] = isNaN(tempOffset) ? 0 : tempOffset;
    }
    Citekey = pdf2citeKey[pdfBlockUid];
    page = page - pdf2pgOffset[pdfBlockUid];
  }
  const citation = eval('`' + pdfParams.citationFormat + '`').replace(/\s+/g, '');
  const hlText = `${perfix}${hlContent}${citation} ${hlBtn} ${pdfAlias}`;
  //Where to put: Append on top or bottom
  let ord = 0
  if (pdfParams.appendHighlight) {
    const children = allChildrenInfo(hlParentBlockUid)[0][0].children;
    if (typeof (children) === 'undefined')
      ord = 0;
    else
      ord = Math.max(...children.map(child => child.order)) + 1;
  }
  //Finally: writing
  createChildBlock(hlParentBlockUid, ord, hlText, hlTextUid);
  //What to put in clipboard
  if (pdfParams.copyBlockRef)
    navigator.clipboard.writeText("((" + hlTextUid + "))");
  else
    navigator.clipboard.writeText(hlContent);
}

///////////Save Annotations in the PDF Data Page in a Table
function saveHighlightData(pdfUid, pdfUrl, hlDataUid, hlTextUid, hlInfo, hlContent) {
  const dataTableUid = getDataTableUid(pdfUrl, pdfUid);
  createChildBlock(dataTableUid, 0, hlTextUid, hlDataUid);
  const posUid = createUid();
  createChildBlock(hlDataUid, 0, hlInfo, posUid);
  createChildBlock(posUid, 0, hlContent, createUid());
}

/************Handle New HL Received END****************/
/*******************************************************/

/*******************************************************/
/**********Render PDF and Highlights BEGIN**************/
/////////////////////Find pdf iframe being highlighted
let allPdfIframes = []; //History of opened pdf on page
let activePdfIframeId = null; //Last active pdf iframe.id

window.addEventListener('blur', function () {
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
  const highlights = getAllHighlights(originalPdfUrl, pdfBlockUid);
  window.setTimeout( // give it 5 seconds to load
    () => iframe.contentWindow.postMessage({ highlights }, '*'), 2000);
}

/////////////////////From PDF URL => Data Page => Retrieve Data
function getAllHighlights(pdfUrl, pdfUid) {
  const dataTableUid = getDataTableUid(pdfUrl, pdfUid);
  return getHighlightsFromTable(dataTableUid);
}

function getDataTableUid(pdfUrl, pdfUid) {
  const pdfDataPageTitle = getDataPageTitle(pdfUrl);
  let pdfDataPageUid = getPageUid(pdfDataPageTitle);
  if (!pdfDataPageUid) //If this is the first time uploading the pdf
    pdfDataPageUid = createDataPage(pdfDataPageTitle, pdfUrl, pdfUid);
  return getNthChildUid(pdfDataPageUid, 2);
}

function getDataPageTitle(pdfUrl) {
  return 'roam/js/pdf/data/' + hashCode(pdfUrl);
}
/////////////////////Initialize a Data Page. Format is:
/////////////////////pdfPageTitle
/////////////////////////pdfUrl
/////////////////////////pdfUid
/////////////////////////{{table}}
function createDataPage(pdfPageTitle, pdfUrl, pdfUid) {
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
function existBlockUid(blockUid) {
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?block [:block/uid])
      :where
	   	  [?block :block/uid \"${blockUid}\"]]`)
  return res.length ? blockUid : null
}

function parentBlockUid(blockUid) {
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?parent [:block/uid])
      :where
          [?parent :block/children ?block]
	   	  [?block :block/uid \"${blockUid}\"]]`)
  return res.length ? res[0][0].uid : null
}

function blockString(blockUid) {
  return window.roamAlphaAPI.q(
    `[:find (pull ?block [:block/string])
	  :where [?block :block/uid \"${blockUid}\"]]`)[0][0].string
}

function allChildrenInfo(blockUid) {
  return window.roamAlphaAPI.q(
    `[:find (pull ?parent [* {:block/children [:block/string :block/uid :block/order]}])
    :where
		[?parent :block/uid \"${blockUid}\"]]`)
}

function queryAllTxtInChildren(blockUid) {
  return window.roamAlphaAPI.q(`[
    :find (pull ?block [
        :block/string
        :block/children
        {:block/children ...}
    ])
    :where [?block :block/uid \"${blockUid}\"]]`)
}

function getPageUid(pageTitle) {
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?page [:block/uid])
	  :where [?page :node/title \"${pageTitle}\"]]`)
  return res.length ? res[0][0].uid : null
}

///////////////Front-End///////////////
function getUidOfContainingBlock(el) {
  return el.closest('.rm-block__input').id.slice(-9)
}

function insertAfter(newEl, anchor) {
  anchor.parentElement.insertBefore(newEl, anchor.nextSibling)
}

function encodePdfUrl(url) {
  return serverPerfix + encodeURI(url);
}

function decodePdfUrl(url) {
  return decodeURI(url).substring(serverPerfix.length);
}

function getNthChildUid(parentUid, order) {
  const allChildren = allChildrenInfo(parentUid)[0][0].children;
  const childrenOrder = allChildren.map(function (child) { return child.order; });
  const index = childrenOrder.findIndex(el => el === order);
  return index !== -1 ? allChildren[index].uid : null;
}

pdfSleep = m => new Promise(r => setTimeout(r, m))

function createPage(pageTitle) {
  let pageUid = createUid()
  const status = window.roamAlphaAPI.createPage(
    {
      "page":
        { "title": pageTitle, "uid": pageUid }
    })
  return status ? pageUid : null
}

function updateBlockString(blockUid, newString) {
  return window.roamAlphaAPI.updateBlock({
    block: { uid: blockUid, string: newString }
  });
}

function hashCode(str) {
  let hash = 0, i, chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function createChildBlock(parentUid, order, childString, childUid) {
  return window.roamAlphaAPI.createBlock(
    {
      location: { "parent-uid": parentUid, order: order },
      block: { string: childString.toString(), uid: childUid }
    })
}

function createUid() {
  let nanoid = (t = 21) => {
    let e = "", r = crypto.getRandomValues(new Uint8Array(t)); for (; t--;) {
      let n = 63 & r[t]; e += n < 36 ? n.toString(36) : n < 62 ? (n - 26).toString(36).toUpperCase() : n < 63 ? "_" : "-"
    }
    return e
  };
  return nanoid(9);
}

/*********Helper API Wrapper Functions END************/
