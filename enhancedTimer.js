const segmentLogPage = 'roam/js/c3/timer/segmentlog'
const runningTimersLog = 'roam/js/c3/timer/running'
const runningPageUid = getPageUid(runningTimersLog);
const segmentLogPageUid = getPageUid(segmentLogPage)

savedTime = {} //sum of all previously completed segments. maps uid => time
totalElapsed = {} //savedTime + elapsed time of the current running segment. maps uid => time 
tInterval = {} //intervals for each timer element (not uid). maps timer element id => interval
uid2allElements = {} //maps uid => array of all corresponding html elements' id


const activateTimers = () => {
    Array.from(document.getElementsByTagName('button'))
        .filter(btn => btn.textContent === "c3-timer")
        .forEach(timer => {
            if (timer.closest('.rm-zoom-item') !== null) {
                timer.innerHTML = ''
                timer.classList.add('timer-zoomed')
            } else {
                const isRef = timer.closest('.rm-block-ref');
                const timerBlockUid = isRef ? isRef.dataset.uid : getUidOfContainingBlock(timer);
                if (!timer.classList.contains('timer-activated')) {
                    savedTime[timerBlockUid] = calcSavedElapsedTime(timerBlockUid) //save it in a map 
                    timer.id = "c3timer-" + timer.closest('.rm-block__input').id
                    const runningLog = readLatestStartTime(timerBlockUid)
                    if (!uid2allElements[timerBlockUid]) uid2allElements[timerBlockUid] = [];
                    if (uid2allElements[timerBlockUid].indexOf(timer.id) == -1)
                        uid2allElements[timerBlockUid].push(timer.id)
                    if (runningLog) { //isRunning
                        timer.classList.add('running');
                        const startTime = parseInt(allChildrenInfo(runningLog[0].uid)[0][0].children[0].string);
                        tInterval[timer.id] = setInterval(function () { showTime(true, timer, timerBlockUid, startTime) }, 1000);
                    } else {
                        timer.classList.add('paused')
                        showTime(false, timer, timerBlockUid, 0)
                    }
                    if (!isRef) {
                        timer.addEventListener("click", timerClicked)
                    }
                }
            }
            timer.classList.add('timer-activated')
        });
};


function calcSavedElapsedTime(timerBlockUid) {
    const match = blockString(timerBlockUid).match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
    if (!match) return 0; //timer is not started. 
    const timerLogs = allChildrenInfo(match[1])[0][0].children;
    if (timerLogs === undefined) return 0; //timer started but record is deleted.
    const elapsedTimes = timerLogs.map(x => calcElapsedTime(x.string));
    return elapsedTimes.reduce((a, b) => a + b)
}

function calcElapsedTime(log) {
    let start, end, duration, s, e, d;
    if (log.includes('>')) {
        [s, e] = log.split(">");
        start = new Date(s)
        end = new Date(e)
        if (start == "Invalid Date" || end == "Invalid Date") return 0;
        return (end < start) ? 0 : end - start;
    } else if (log.includes('+')) {
        [s, d] = log.split("+");
        start = new Date(s).getTime();
        duration = parseDuration(d);
        if (start == "Invalid Date" || duration == "Invalid Time") return 0;
        return duration;
    } else {
        [e, d] = log.split("-");
        end = new Date(e).getTime()
        duration = parseDuration(d);
        if (end == "Invalid Date" || duration == "Invalid Time") return 0;
        return duration;
    }
}

function parseDuration(d) {
    const match = d.match(/\s*(([\d]*)\s*h)*\s*(([\d]*)\s*m)*\s*(([\d]*)\s*s)*/)
    let [h, m, s] = [match[2], match[4], match[6]].map(x => (x == undefined) ? 0 : parseInt(x))
    if (isNaN(h) || isNaN(m) || isNaN(s)) return "Invalid Time";
    return h * (60 * 60 * 1000) + m * (60 * 1000) + s * 1000
}


function timerClicked(e) {
    const timer = e.srcElement;
    const timerBlockUid = getUidOfContainingBlock(timer);
    if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        pauseAllTimerElements(timerBlockUid)
    } else if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openRecordedTimes(timerBlockUid)
    } else if (!timer.classList.contains('running')) {
        startTimer(timerBlockUid);
    } else {
        pauseTimer(timerBlockUid);
    }
}

// Don't care if the timer is running or not
// Just opens all of the recorded times in the side bar 
function openRecordedTimes(timerBlockUid) {
    const match = blockString(timerBlockUid).match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
    if (!match) return; //timer is not started. 
    window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: "block", "block-uid": match[1] } })
}

function pauseAllTimerElements(timerBlockUid) {
    uid2allElements[timerBlockUid].forEach(function (timerId, index, array) {
        let timer = document.getElementById(timerId);
        if (timer) {
            clearInterval(tInterval[timerId]);
            timer.classList.add('paused');
            timer.classList.remove('running');
            showTime(false, timer, timerBlockUid, 0)
        } else array.splice(index, 1); //the element is not on the page so remove it.
    });
    const runningLog = readLatestStartTime(timerBlockUid);
    if (!runningLog) return null
    window.roamAlphaAPI.deleteBlock({ "block": { "uid": runningLog[0].uid } });
    return runningLog;
}


function readLatestStartTime(timerBlockUid) {
    const allRunningTimers = allChildrenInfo(runningPageUid)[0][0].children;
    if (allRunningTimers === undefined) return false;
    const runningLog = allRunningTimers.map(function (x) { return (x.string === timerBlockUid) ? x : null; }).filter(t => t != null);
    return (runningLog.length != 0) ? runningLog : false;
}

function writeLatestStartTime(timerBlockUid, startTime) {
    const logUid = createUid();
    createChildBlock(runningPageUid, 1, timerBlockUid, logUid)
    createChildBlock(logUid, 0, startTime, createUid())
}

function writeSegmentLog(timerBlockUid, startTime, endTime) {
    //if !exist a log for the timer create one
    const match = blockString(timerBlockUid).match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
    let segmentUid;
    if (!match) {
        segmentUid = createUid();
        const today = new Date();
        createChildBlock(getPageUid(segmentLogPage + '/' + today.getFullYear() + '/' + today.getMonth()), 1, timerBlockUid, segmentUid)
        const replacement = blockString(timerBlockUid).replace(']}}', ']:((' + segmentUid + '))}}');
        updateBlockString(timerBlockUid, replacement)
    } else {
        segmentUid = match[1]
    }
    createChildBlock(segmentUid, 0, new Date(startTime).toLocaleString() + ' > ' + new Date(endTime).toLocaleString(), createUid())
}


function startTimer(timerBlockUid) {
    startTime = new Date().getTime();
    writeLatestStartTime(timerBlockUid, startTime);
    uid2allElements[timerBlockUid].forEach(function (timerId, index, array) {
        let timer = document.getElementById(timerId);
        if (timer) {
            tInterval[timerId] = setInterval(function () { showTime(true, timer, timerBlockUid, startTime) }, 1000);
            timer.classList.add('running');
            timer.classList.remove('paused');
        } else array.splice(index, 1); //the element is not on the page so remove it.
    })
    pauseSameBranchTimers(timerBlockUid)
}

function pauseSameBranchTimers(timerBlockUid) {
    const allRunningTimers = allChildrenInfo(runningPageUid)[0][0].children;
    if (allRunningTimers === undefined) return false;
    const allRunningTimersUid = allRunningTimers.map(function (x) { return x.string; });

    allRunningTimersUid.forEach(runningUid => {
        if (isAncestor(runningUid, timerBlockUid) || isAncestor(timerBlockUid, runningUid)) {
            pauseTimer(runningUid)
        }
    })
}

function getUidFromNestedNodes(node, descendantUids) {
    if (node.uid) descendantUids.push(node.uid)
    if (node.children)
        node.children.forEach(child => getUidFromNestedNodes(child, descendantUids))
}

function isAncestor(a, b) {
    const results = window.roamAlphaAPI.q(
        `[:find (pull ?root [* {:block/children [:block/uid {:block/children ...}]}])
        :where
            [?root :block/uid \"${a}\"]]`);
    if (!results.length) return false;
    let descendantUids = [];
    getUidFromNestedNodes(results[0][0], descendantUids)
    return descendantUids.includes(b);
}

function pauseTimer(timerBlockUid) {
    const endTime = new Date().getTime();
    savedTime[timerBlockUid] = totalElapsed[timerBlockUid];
    const runningLog = pauseAllTimerElements(timerBlockUid)
    const startTime = parseInt(blockString(getNthChildUid(runningLog[0].uid, 0)));
    writeSegmentLog(timerBlockUid, startTime, endTime);
}

function showTime(run, timer, timerBlockUid, startTime) {
    updatedTime = startTime ? new Date().getTime() : 0;
    total = (updatedTime - startTime) + savedTime[timerBlockUid];
    var hours = Math.floor(total / (1000 * 60 * 60));
    var minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((total % (1000 * 60)) / 1000);
    hours = (hours != 0) ? hours + 'h ' : '';
    minutes = (minutes != 0) ? minutes + 'm ' : '';
    seconds = seconds + 's'
    const char = run ? '❚❚' : '►';
    timer.innerHTML = char + ' ' + hours + minutes + seconds;
    totalElapsed[timerBlockUid] = total;
}

function getUidOfContainingBlock(el) {
    return el.closest('.rm-block__input').id.slice(-9)
}

function getNthChildUid(parentUid, order) {
    const allChildren = allChildrenInfo(parentUid)[0][0].children;
    const childrenOrder = allChildren.map(function (child) { return child.order; });
    const index = childrenOrder.findIndex(el => el === order);
    return index !== -1 ? allChildren[index].uid : null;
}

function getPageUid(pageTitle) {
    const res = window.roamAlphaAPI.q(
        `[:find (pull ?page [:block/uid])
        :where [?page :node/title \"${pageTitle}\"]]`)

    let pageUid = res.length ? res[0][0].uid : null;
    if (!pageUid) {
        pageUid = createPage(pageTitle);
        createChildBlock(pageUid, 0, 'Timer Log', createUid());
    }
    return pageUid;
}

function createPage(pageTitle) {
    let pageUid = createUid()
    const status = window.roamAlphaAPI.createPage(
        {
            "page":
                { "title": pageTitle, "uid": pageUid }
        })
    return status ? pageUid : null
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


function blockString(blockUid) {
    return window.roamAlphaAPI.q(
        `[:find (pull ?block [:block/string])
        :where [?block :block/uid \"${blockUid}\"]]`)[0][0].string
}

function createChildBlock(parentUid, order, childString, childUid) {
    return window.roamAlphaAPI.createBlock(
        {
            location: { "parent-uid": parentUid, order: order },
            block: { string: childString.toString(), uid: childUid }
        })
}


function allChildrenInfo(blockUid) {
    let results = window.roamAlphaAPI.q(
        `[:find (pull ?parent [* {:block/children [:block/string :block/uid :block/order]}])
    :where
		[?parent :block/uid \"${blockUid}\"]]`)
    return (results.length == 0) ? undefined : results
}


function updateBlockString(blockUid, newString) {
    return window.roamAlphaAPI.updateBlock({
        block: { uid: blockUid, string: newString }
    });
}

setInterval(activateTimers, 1000);


