// ==UserScript==
// @name         Enhanced-PDF Extension for Roam Research
// @author       hungriesthippo <https://github.com/hungriesthippo> & CCC <https://github.com/c3founder>
// @require 	 -
// @version      1.0
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
/* Begin Importing Utility Functions */
if (typeof ccc !== 'undefined' && typeof ccc.util !== 'undefined') {
  //Somebody has already loaded the utility
  startC3PdfExtension();
} else {
  let s = document.createElement("script");
  s.type = "text/javascript";
  s.src = "https://c3founder.github.io/Roam-Enhancement/enhancedUtility.js"
  s.id = 'c3util4pdf'
  s.onload = () => { startC3PdfExtension() }
  try { document.getElementById('c3util4pdf').remove() } catch (e) { };
  document.getElementsByTagName('head')[0].appendChild(s);
}
/* End Importing Utility Functions */



function startC3PdfExtension() {
  var ccc = window.ccc || {};
  var c3u = ccc.util;
  /*******************************************************/
  /**********************Main BEGIN***********************/

  // const serverPerfix = 'http://localhost:3000/?url=';
  const serverPerfix = 'https://roampdf.web.app/?url=';
  const pdfChar = ' ';


  function initPdf() {
    Array.from(document.getElementsByTagName('iframe')).forEach(iframe => {
      if (!iframe.classList.contains('pdf-activated')) {
        try {
          if (new URL(iframe.src).pathname.endsWith('.pdf')) {
            const originalPdfUrl = iframe.src; //the permanent pdfId
            iframe.id = "pdf-" + iframe.closest('.roam-block').id; //window level pdfId          
            const pdfBlockUid = c3u.getUidOfContainingBlock(iframe); //for click purpose
            allPdfIframes.push(iframe); //save for interaction
            renderPdf(iframe); //render pdf through the server 
            sendHighlights(iframe, originalPdfUrl, pdfBlockUid);
          }
        } catch { } // some iframes have invalid src
      }
      if (iframe.src.startsWith(serverPerfix)) {
        adjustPdfIframe(iframe);
      }
    })
    activateButtons();
  }
  ///////////////Responsive PDF Iframe 
  function adjustPdfIframe(iframe) {
    const reactParent = iframe.closest('.react-resizable')
    const reactHandle = reactParent.querySelector(".react-resizable-handle")
    const hoverParent = iframe.closest('.hoverparent')
    reactHandle.style.display = 'none';
    reactParent.style.width = '100%';
    reactParent.style.height = '100%';
    hoverParent.style.width = '100%';
    hoverParent.style.height = '100%';
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
          if (c3u.existBlockUid(match[1])) {//If the data page was deleted ignore 
            await c3u.sleep(3000) //Maybe someone is moving blocks or undo                  
            if (!c3u.existBlockUid(c3u.blockString(match[1]))) {
              //Delete the date row                
              const hlDataRowUid = match[1];
              const hlDataRow = c3u.queryAllTxtInChildren(hlDataRowUid);
              const toDeleteHighlight = getHighlight(hlDataRow[0][0]);
              const dataTableUid = c3u.parentBlockUid(hlDataRowUid);
              c3u.deleteBlock(hlDataRowUid)
              //Delete the hl on pdf (send message to render)            
              const dataPageUid = c3u.parentBlockUid(dataTableUid);
              const pdfUrl = encodePdfUrl(c3u.blockString(c3u.getNthChildUid(dataPageUid, 0)));
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
        await c3u.sleep(1000) //Maybe someone is moving blocks or undo
        const pdfUid = iframe.id.slice(-9)
        if (!c3u.existBlockUid(pdfUid)) { //pdf block deleted
          const pdfUrl = decodePdfUrl(iframe.src)
          const pdfDataPageTitle = getDataPageTitle(pdfUrl);
          const pdfDataPageUid = c3u.getPageUid(pdfDataPageTitle);
          if (pdfDataPageUid) { //If the data page exists
            const tableUid = c3u.getNthChildUid(pdfDataPageUid, 2);
            const res = c3u.allChildrenInfo(tableUid)[0][0];
            c3u.deletePage(pdfDataPageUid)
            res.children.map(async function (child) {
              //You can check their existence but seems redundent. 
              c3u.deleteBlock(child.string);
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
      .filter(isUnObservedHighlightBtn)
      .forEach(btn => {
        if (!btn.closest('.rm-zoom-item'))
          hlBtnAppearsObserver.observe(btn);
        btn.classList.add('btn-observed');
      })
    activateSortButtons();
  }

  function activateSortButtons() {
    Array.from(document.getElementsByTagName('button'))
      .filter(isInactiveSortBtn)
      .forEach(btn => {
        const sortBtnBlockUid = c3u.getUidOfContainingBlock(btn);
        btn.classList.add('btn-sort-highlight', 'btn-pdf-activated');
        const pdfUid = c3u.parentBlockUid(sortBtnBlockUid)
        const match = c3u.blockString(pdfUid).match(/\{{\[?\[?pdf\]?\]?:\s(.*)}}/);
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
            highlights.map(function (item) { c3u.createChildBlock(sortBtnBlockUid, cnt++, "((" + item.id + "))", c3u.createUid()); })

        }
      })
  }
  let options = {
    root: document.querySelector('.roam-app'),
    rootMargin: "0px 0px 500px 0px",
    threshold: 1.0
  }

  function activateSingleBtn(entries) {
    entries.forEach((entry) => {
      const btn = entry.target;
      if (isInactiveHighlightBtn(btn) && entry.intersectionRatio > .25) {
        const hlInfo = getHlInfoFromBtn(btn);
        const highlight = getSingleHighlight(hlInfo.uid)
        let pdfInfo = getPdfInfoFromHighlight(hlInfo.uid);
        if (pdfInfo) {
          const btnBlock = btn.closest(".rm-block__input");
          const page = btn.innerText;
          addBreadcrumb(btnBlock, page, pdfInfo.uid);
          pdfInfo.url = encodePdfUrl(pdfInfo.url);
          handleBtn(btn, pdfInfo, hlInfo, highlight);
        }
      }
    });
  }

  hlBtnAppearsObserver = new IntersectionObserver(activateSingleBtn, options);

  /////////////////////////////////////////////////////////
  ///////////////Portal to the Data Page //////////////////
  /////////////////////////////////////////////////////////
  ///////////////From highlight => Data page => Retrieve PDF url and uid.
  function getPdfInfoFromHighlight(hlBlockUid) {
    let match = c3u.blockString(hlBlockUid).match(/\[..?]\(\(\((.........)\)\)\)/);
    if (!match[1]) return null;
    const pdfUid = match[1];
    match = c3u.blockString(pdfUid).match(/\{{\[?\[?pdf\]?\]?:\s(.*)}}/);
    if (!match[1]) return null;
    const pdfUrl = match[1];
    return { url: pdfUrl, uid: pdfUid };
  }

  ///////////////From highlight => Row of the data table => Highlight coordinates
  function getSingleHighlight(hlBlockUid) {
    const hlDataRowUid = getHighlightDataBlockUid(hlBlockUid);
    const hlDataRow = c3u.queryAllTxtInChildren(hlDataRowUid);
    if (hlDataRow.length === 0) return null;
    return getHighlight(hlDataRow[0][0]);
  }

  ///////////////From button's text jump to the corresponding data table row
  function getHighlightDataBlockUid(hlBlockUid) {
    const match = c3u.blockString(hlBlockUid).match(/{{\d+:\s*(.........)}}/);
    if (!match) return null;
    return match[1]
  }

  ///////////////Get the Original Highlight
  ///////////////Where am I? Main Hilight or Reference?
  function getHlInfoFromBtn(btn) {
    let hlType, hlUid;
    const blockRefSpan = btn.closest('.rm-block-ref')
    if (!blockRefSpan) {
      hlType = 'main';
      hlUid = c3u.getUidOfContainingBlock(btn);
    } else {
      hlType = 'ref';
      hlUid = blockRefSpan.dataset.uid
    }
    return { type: hlType, uid: hlUid };
  }

  function getHighlightsFromTable(uid) {
    const hls = c3u.queryAllTxtInChildren(uid)[0][0].children;
    return hls.map(function (x) { return getHighlight(x); }).filter(hl => hl != null);
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
  ////////Activate all of the Highlight Buttons////////
  ////////////////////////////////////////////////////////////

  ////////Open the PDF and send the HLs to server
  async function handleHighlightClick(e, pdfInfo, highlight) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    let iframe = getOpenIframeElementWithSrc(pdfInfo.url);
    if (!iframe) { //Iframe is closed      
      c3u.openBlockInSidebar('block', pdfInfo.uid)
      await c3u.sleep(3000);
      iframe = getOpenIframeElementWithSrc(pdfInfo.url);
    }
    iframe.contentWindow.postMessage({ scrollTo: highlight }, '*');
  }

  function getOpenIframeElementWithSrc(iframeSrc) {
    return Array.from(document.getElementsByTagName('iframe'))
      .find(iframe => iframe.src === iframeSrc);
  }

  function handleBtn(btn, pdfInfo, hlInfo, highlight) {
    const blockUid = c3u.getUidOfContainingBlock(btn);
    //Shared for main and reference jump btns 
    const extraClass = 'btn-' + hlInfo.type + '-annotation'
    btn.classList.add(extraClass, 'btn', 'btn-default', 'btn-pdf-activated');
    const btnId = getHighlightDataBlockUid(hlInfo.uid);
    btn.id = hlInfo.type + '-hlBtn-' + btnId;
    btn.addEventListener("click", (e) => { handleHighlightClick(e, pdfInfo, highlight) });

    if (hlInfo.type === 'ref') {
      //Fix highlight btn
      btn.classList.add('popup');
      const wrapperSpan = btn.closest('.bp3-popover-wrapper')
      const closestSpan = btn.closest('span')
      closestSpan.classList.add('displacedBtns')
      closestSpan.parentElement.closest('span').querySelector('.rm-block__ref-count-footnote')?.closest('.bp3-popover-wrapper').remove();
      c3u.insertAfter(closestSpan, wrapperSpan)
      //Fix footnote btn if exists
      const footnote = wrapperSpan.closest('span').querySelector('.rm-block__ref-count-footnote')
      footnote?.classList.add('popup');
      //Add replace with text and alias btns      

      let btnRepText = null, btnRepAlias = null;
      if (pdfParams.textChar !== '') {
        btnRepText = createCtrlBtn(1, blockUid, hlInfo.uid);
        btnRepText.addEventListener("click", function (e) {
          replaceHl(blockUid, hlInfo.uid, 1, btn)
        });
        c3u.insertAfter(btnRepText, btn)
      }
      if (pdfParams.aliasChar !== '') {
        btnRepAlias = createCtrlBtn(0, blockUid, hlInfo.uid);
        btnRepAlias.addEventListener("click", function (e) {
          replaceHl(blockUid, hlInfo.uid, 0, btn)
        });
        c3u.insertAfter(btnRepAlias, btn)
      }
    }
  }

  function createCtrlBtn(asText, btnBlockUid, hlBlockUid) {
    const trail = asText ? 'text' : 'alias';
    const btnText = asText ? pdfParams.textChar : pdfParams.aliasChar;
    const cssClass = 'btn-rep-' + trail;

    const newBtn = document.createElement('button');
    newBtn.classList.add(cssClass, 'btn', 'btn-default', 'btn-pdf-activated', 'popup');
    newBtn.innerText = btnText;
    newBtn.title = 'Replace with ' + trail;
    newBtn.id = btnBlockUid + hlBlockUid + asText
    return newBtn;
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
    if (pdfParams.outputHighlighAt === 'cousin') {
      gParentRef = c3u.parentBlockUid(c3u.parentBlockUid(pdfUid));
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
    if (!res.length) return ' ';
    // match attribute: or attribute::
    const attrMatch = new RegExp(`^${attribute}::?\\s*(.*)$`);
    return res[0][0].string.match(attrMatch)[1];
  }

  ///////////////////Main Button Replacement//////////////////




  ///////////////////Main Button Onclick//////////////////
  ///////////////HL Reference Replacement: As Text or Alias
  function replaceHl(btnBlockUid, hlBlockUid, asText, btn) {
    //Prepare the substitute string
    const hl = c3u.blockString(hlBlockUid);
    const match = hl.match(/\{\{\d+:\s*.........\}\}\s*\[..?\]\(\(\(.........\)\)\)/)
    const hlText = hl.substring(0, match.index);
    const hlAlias = hlText + "[*](((" + hlBlockUid + ")))";

    //Search for what to replace 
    const blockTxt = c3u.blockString(btnBlockUid);
    const re = new RegExp("\\(\\(" + hlBlockUid + "\\)\\)", "g");
    let newBlockTxt;

    if (asText)
      newBlockTxt = blockTxt.replace(re, hlText)
    else
      newBlockTxt = blockTxt.replace(re, hlAlias)

    c3u.updateBlockString(btnBlockUid, newBlockTxt)
    
    const toRemoveSpans = btn.closest('.rm-block__input').querySelectorAll('.displacedBtns')
    toRemoveSpans.forEach(item => item.remove())
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
      case 'openHlBlock':
        handleOpenHighlight(event)
        break;
      case 'copyRef':
        handleCopyHighlightRef(event)
        break;
    }
  }

  function handleCopyHighlightRef(event) {
    const toOpenHlTextUid = event.data.highlight.id;
    const toOpenHlDataRowUid = getHighlightDataBlockUid(toOpenHlTextUid);
    const hlBlockUid = c3u.blockString(toOpenHlDataRowUid);
    navigator.clipboard.writeText("((" + hlBlockUid + "))");
  }

  function handleOpenHighlight(event) {
    const toOpenHlTextUid = event.data.highlight.id;
    const toOpenHlDataRowUid = getHighlightDataBlockUid(toOpenHlTextUid);
    const hlBlockUid = c3u.blockString(toOpenHlDataRowUid);
    c3u.openBlockInSidebar('block', hlBlockUid)
    c3u.sleep(30) //prevent multiple block opening.
  }

  function handleUpdatedHighlight(event) {
    const newColorNum = parseInt(event.data.highlight.color);
    if (pdfParams.addColoredHighlight) {
      const hlId = event.data.highlight.id;
      updateHighlightText(newColorNum, hlId);
      updateHighlightData(newColorNum, hlId);
    }
  }

  function updateHighlightText(newColorNum, hlId) {
    console.log(hlId)
    console.log(newColorNum)
    let newColorString = '';
    switch (newColorNum) {
      case 0: newColorString = ""; break;
      case 1: newColorString = "yellow"; break;
      case 2: newColorString = "red"; break;
      case 3: newColorString = "green"; break;
      case 4: newColorString = "blue"; break;
      case 5: newColorString = "purple"; break;
      case 6: newColorString = "grey"; break;
    }
    // if (newColorString !== '') {
    let hlText = c3u.blockString(hlId);
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
    const content = restTxt.match(/(.*)({{\d+:\s*.........}}\s*\[..?\]\(\(\(.........\)\)\))/);
    const isImage = restTxt.match(/.*(\!\[.*\]\(.*\))\s*{{\d+:\s*.........}}\s*\[..?\]\(\(\(.........\)\)\)/)
    const isHlTxt = restTxt.match(/.*(\^{2}(.*)\^{2}).*/)
    let mainContent;
    if (isImage)
      mainContent = ` ${isImage[1]}`;
    else if (isHlTxt) {
      mainHl = isHlTxt[1];
      mainTxt = isHlTxt[2];
    }
    else {
      mainHl = `^^${content[1]}^^`;
      mainTxt = content[1];
    }
    const trail = content[2];
    let colorPerfix = `#h:${newColorString}`;
    mainContent = mainHl;
    if (newColorString == '') { //Reset color
      colorPerfix = '';
      mainContent = mainTxt;
    }
    c3u.updateBlockString(hlId, `${perfix} ${colorPerfix}${mainContent} ${trail}`);
    // }
  }

  function updateHighlightData(newColorNum, toUpdateHlTextUid) {
    const toUpdateHlDataRowUid = getHighlightDataBlockUid(toUpdateHlTextUid)
    const toUpdateHlInfoUid = c3u.getNthChildUid(toUpdateHlDataRowUid, 0);
    const toUpdateHlInfoString = c3u.blockString(toUpdateHlInfoUid);
    let toUpdateHlInfo = JSON.parse(toUpdateHlInfoString)
    let hlPosition;
    if (typeof (toUpdateHlInfo.position) === 'undefined') //if older version highlight
      hlPosition = toUpdateHlInfo;
    else
      hlPosition = toUpdateHlInfo.position;
    c3u.updateBlockString(toUpdateHlInfoUid, JSON.stringify({ position: hlPosition, color: newColorNum }));
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
    const pdfBlockUid = c3u.getUidOfContainingBlock(iframe);
    let hlContent;
    const pdfAlias = `[${pdfChar}](((${pdfBlockUid})))`;
    const hlDataUid = c3u.createUid();
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
    const toDeleteHlDataRowUid = getHighlightDataBlockUid(toDeleteHlTextUid)
    c3u.deleteBlock(toDeleteHlTextUid)
    c3u.deleteBlock(toDeleteHlDataRowUid)
  }

  ///////////For the Cousin Output Mode: Find the Uncle of the PDF Block. 
  function getUncleBlock(pdfBlockUid) {
    const pdfParentBlockUid = c3u.parentBlockUid(pdfBlockUid);
    const gParentBlockUid = c3u.parentBlockUid(pdfParentBlockUid);
    let dictUid2Ord = {};
    let dictOrd2Uid = {};
    if (!gParentBlockUid) return null;
    const mainBlocksUid = c3u.allChildrenInfo(gParentBlockUid);
    mainBlocksUid[0][0].children.map(child => {
      dictUid2Ord[child.uid] = child.order;
      dictOrd2Uid[child.order] = child.uid;
    });
    //Single assumption: PDF & Highlights are assumed to be siblings.
    let hlParentBlockUid = dictOrd2Uid[dictUid2Ord[pdfParentBlockUid] + 1];
    if (!hlParentBlockUid) {
      hlParentBlockUid = c3u.createUid()
      c3u.createChildBlock(gParentBlockUid, dictUid2Ord[pdfParentBlockUid] + 1,
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
      await c3u.sleep(100);
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
    let ord = (pdfParams.appendHighlight) ? 'last' : 0;
    //Finally: writing
    c3u.createChildBlock(hlParentBlockUid, ord, hlText, hlTextUid);
    //What to put in clipboard
    if (pdfParams.copyBlockRef)
      navigator.clipboard.writeText("((" + hlTextUid + "))");
    else
      navigator.clipboard.writeText(hlContent);
  }

  ///////////Save Annotations in the PDF Data Page in a Table
  function saveHighlightData(pdfUid, pdfUrl, hlDataUid, hlTextUid, hlInfo, hlContent) {
    const dataTableUid = getDataTableUid(pdfUrl, pdfUid);
    c3u.createChildBlock(dataTableUid, 0, hlTextUid, hlDataUid);
    const posUid = c3u.createUid();
    c3u.createChildBlock(hlDataUid, 0, hlInfo, posUid);
    c3u.createChildBlock(posUid, 0, hlContent, c3u.createUid());
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
    let pdfDataPageUid = c3u.getPageUid(pdfDataPageTitle);
    if (!pdfDataPageUid) //If this is the first time uploading the pdf
      pdfDataPageUid = createDataPage(pdfDataPageTitle, pdfUrl, pdfUid);
    return c3u.getNthChildUid(pdfDataPageUid, 2);
  }

  function getDataPageTitle(pdfUrl) {
    return 'roam/js/pdf/data/' + c3u.hashCode(pdfUrl);
  }
  /////////////////////Initialize a Data Page. Format is:
  /////////////////////pdfPageTitle
  /////////////////////////pdfUrl
  /////////////////////////pdfUid
  /////////////////////////{{table}}
  function createDataPage(pdfPageTitle, pdfUrl, pdfUid) {
    const pdfDataPageUid = c3u.createPage(pdfPageTitle);
    c3u.createChildBlock(pdfDataPageUid, 0, pdfUrl, c3u.createUid());
    c3u.createChildBlock(pdfDataPageUid, 1, pdfUid, c3u.createUid());
    c3u.createChildBlock(pdfDataPageUid, 2, "{{table}}", c3u.createUid());
    return pdfDataPageUid;
  }
  /***********Render PDF and Highlights END***************/
  /*******************************************************/

  /*******************************************************/
  /*********Helper API Functions BEGIN************/

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
  }

  function isUnObserved(btn) {
    return !btn.classList.contains('btn-observed');
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
    return isSortBtn(btn) && isInactive(btn)
  }

  function isInactiveHighlightBtn(btn) {
    return isHighlightBtn(btn) && isInactive(btn)
  }

  function isUnObservedHighlightBtn(btn) {
    return isHighlightBtn(btn) && isUnObserved(btn)
  }


  function encodePdfUrl(url) {
    return serverPerfix + encodeURI(url);
  }

  function decodePdfUrl(url) {
    return decodeURI(url).substring(serverPerfix.length);
  }

  /*********Helper Functions END************/
  window.setInterval(initPdf, 1000);

}