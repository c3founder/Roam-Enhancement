const ocrParams = window.ocrParams;
/* Begin Importing Other Packages */
if (!document.getElementById("Tesseract")) {
    let s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://unpkg.com/tesseract.js@2.0.0/dist/tesseract.min.js";
    s.id = "Tesseract"
    document.getElementsByTagName("head")[0].appendChild(s);
}
if (!document.getElementById("Mousetrap")) {
    let s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://unpkg.com/mousetrap@1.6.5/mousetrap.js";
    s.id = "Mousetrap"
    s.onload = () => { bindShortkeys() }
    document.getElementsByTagName("head")[0].appendChild(s);
}
/* End Importing Other Packages */

/* Begin Importing Utility Functions */
if (typeof ccc !== 'undefined' && typeof ccc.util !== 'undefined') {
    //Somebody has already loaded the utility
    startC3OcrExtension();
} else {
    let s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://c3founder.github.io/Roam-Enhancement/enhancedUtility.js"
    s.id = 'c3util4ocr'
    s.onload = () => { startC3OcrExtension() }
    try { document.getElementById('c3util').remove() } catch (e) { };
    document.getElementsByTagName('head')[0].appendChild(s);
}
/* End Importing Utility Functions */

function startC3OcrExtension() {
    var ccc = window.ccc || {};
    var c3u = ccc.util;
    let parsedStr = '';

    function scanForNewImages(mutationsList = null) {
        let oldImg = document.querySelectorAll('.rm-inline-img.img-ready4ocr');
        let curImg = document.getElementsByClassName('rm-inline-img');
        if (oldImg.length === curImg.length) return;
        Array.from(curImg).forEach(im => {
            if (!im.classList.contains('img-ready4ocr')) {
                im.classList.add('img-ready4ocr');
                im.addEventListener('click', async function (e) {
                    let ocrBlockUid;
                    try {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            const blockUid = c3u.getUidOfContainingBlock(e.target);
                            ocrBlockUid = c3u.createUid();
                            c3u.createChildBlock(blockUid, 0, "Granting wishes...", ocrBlockUid)

                            parsedStr = await parseImage(e);
                            let postfix = ocrParams.saveRef2Img ? " [*](" + e.target.src + ") " : "";
                            c3u.updateBlockString(ocrBlockUid, parsedStr + postfix)
                        }
                    }
                    catch (err) {
                        let msg = "OCR was unsuccessful."
                        c3u.updateBlockString(ocrBlockUid, msg);
                    }
                });
            }
        });
    };


    async function parseImage(e) {
        const tempImg = new Image();
        tempImg.crossOrigin = "Anonymous";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        tempImg.src = "https://ccc-cors-anywhere.herokuapp.com/" + e.target.src //+ "?not-from-cache-please"
        let str = tempImg.onload = async function () {
            let ocrStr;
            canvas.width = tempImg.width;
            canvas.height = tempImg.height;
            ctx.drawImage(tempImg, 0, 0);
            if (e.ctrlKey || e.metaKey) {  //Math OCR
                ocrStr = await parseMath(e.target.src);
            }
            if (e.shiftKey) {
                ocrStr = await parseLan(tempImg, ocrParams.lang1);
            }
            if (e.altKey) {
                ocrStr = await parseLan(tempImg, ocrParams.lang2);
            }
            return ocrStr
        }();
        return str;
    }

    //OCR the image in url using language lan
    async function parseLan(url, lan) {
        return Tesseract.recognize(url, lan)
            .then(({ data: { text } }) => {
                return (text.replace(/\n/g, " "));
            });
    }

    //OCR the given image using the Mathpix API
    async function parseMath(url) {
        //Send the request to Mathpix API
        let ocrReq = {
            "src": url,
            "formats": "text",
        }
        let latexStr = await postData('https://api.mathpix.com/v3/text', ocrReq)
            .then(response => {
                return (response.text)
            });
        //Make the math Roam-readable
        latexStr = latexStr.replace(/(\\\( )|( \\\))/g, "$$$$");
        latexStr = latexStr.replace(/(\n\\\[\n)|(\n\\\]\n?)/g, " $$$$ ");
        return (latexStr)
    }

    async function postData(url = '', data = {}) {
        // Default options are marked with *
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.      
            headers: {
                "content-type": "application/json",
                "app_id": ocrParams.appID,
                "app_key": ocrParams.appKey
            },
            body: JSON.stringify(data) // body data type must match "Content-Type" header
        });
        return response.json(); // parses JSON response into native JavaScript objects
    }

    observerImg = new MutationObserver(scanForNewImages);
    observerImg.observe(document, { childList: true, subtree: true })
}

function bindShortkeys() {
    Mousetrap.prototype.stopCallback = function () { return false }

    Mousetrap.bind(ocrParams.cleanKey, async function (e) {
        e.preventDefault();
        const activeTxt = document.querySelector('textarea.rm-block-input');
        let recognizedTxt = activeTxt.value;
        const blockUid = window.ccc.util.getUidOfContainingBlock(activeTxt);
        const parentUid = window.ccc.util.parentBlockUid(blockUid);
        window.ccc.util.deleteBlock(blockUid);
        window.ccc.util.updateBlockString(parentUid, recognizedTxt);
        return false;
    }, 'keydown');
}