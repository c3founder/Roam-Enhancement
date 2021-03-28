function isRTL(s) {
    let ltrChars = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' + '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
        rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
        rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');

    return rtlDirCheck.test(s);
};

function changeDir(txtEl, forceCheck = false) {
    if (!txtEl) return;
    let content = (txtEl.innerText !== '') ? txtEl.innerText : txtEl.textContent;
    if (content === undefined) return;
    if (content.length > 0) {
        let container = txtEl.closest('.roam-block-container')
        let header = (container === null)
        container = header ? txtEl.closest('h1') : container
        let starPage = (container === null) 
        container = starPage ? txtEl.closest('a') : container
        if (!container.dataset.direction || forceCheck) { //forceCheck to response to dynamic change in textareas
            let newContent = content.replace(/[0-9\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]*/gi, '');
            let rtl = isRTL(newContent[0])
            if (rtl) container.dataset.direction = 'rtl';
            else container.dataset.direction = 'ltr';            
            if (!header && !starPage) { 
                let main = txtEl.closest('.rm-block-main')
                main.classList.remove('main-rtl', 'main-ltr')
                let multibar = container.querySelector('.rm-multibar')
                multibar.classList.remove('multibar-rtl', 'multibar-ltr')
                if (rtl) {
                    main.classList.add('main-rtl');
                    multibar.classList.add('multibar-rtl');
                }
                else {
                    main.classList.add('main-ltr');
                    multibar.classList.add('multibar-ltr');
                }

            }
        }
    }
}

const activateAutoDir = () => {
    if (typeof (document) == 'undefined') return;
    //Fix all txts in blocks
    Array.from(document.querySelectorAll('div.rm-block__input > span')).forEach(txtEl => changeDir(txtEl));
    Array.from(document.querySelectorAll('h1.rm-title-display > span')).forEach(txtEl => changeDir(txtEl));
    //Fix star pages in left side bar
    Array.from(document.querySelectorAll('div.starred-pages > a > div')).forEach(txtEl => changeDir(txtEl));

    //Fix txts in the body - textarea
    changeDir(document.querySelector('textarea'), true);
    //Fix txts in the title - textarea    
    changeDir(document.querySelector('h1.rm-title-editing-display > span'), true);
}

setInterval(activateAutoDir, 1000);