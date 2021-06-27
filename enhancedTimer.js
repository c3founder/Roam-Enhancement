/* Begin Importing Utility Functions */
if (typeof ccc !== 'undefined' && typeof ccc.util !== 'undefined') {
    //Somebody has already loaded the utility
    startC3OcrExtension()
} else {
    let s = document.createElement("script");
    s.type = "text/javascript";
    s.src = "https://c3founder.github.io/Roam-Enhancement/enhancedUtility.js"
    s.id = 'c3util'
    s.onload = () => { startC3OcrExtension() }
    document.getElementsByTagName('head')[0].appendChild(s);
}
/* End Importing Utility Functions */

function startC3CounterExtension() {
    var ccc = window.ccc || {};
    var c3u = ccc.util;

    function activateCounter() {
        Array.from(document.getElementsByTagName('button'))
            .filter(btn => btn.textContent === "c3-counter")
            .forEach(counter => {
                if (counter.closest('.rm-zoom-item') !== null) {
                    counter.innerHTML = ''
                    counter.classList.add('counter-zoomed')
                } else {
                    if (!counter.classList.contains('counter-activated')) {
                        const isRef = counter.closest('.rm-block-ref');
                        const counterBlockUid = isRef ? isRef.dataset.uid : c3u.getUidOfContainingBlock(counter);
                        const match = c3u.blockString(counterBlockUid).match(/.*{{\[\[c3-counter\]\]:\s*(\d*)}}.*/)
                        counter.innerHTML = (match) ? match[1] : '0'
                        if (!match) {
                            const replacement = c3u.blockString(counterBlockUid).replace(']}}', ']:0}}');
                            c3u.updateBlockString(counterBlockUid, replacement)
                        }
                        if (!isRef) {
                            counter.addEventListener("click", counterClicked)
                        }
                    }
                }
                counter.classList.add('counter-activated')
            });
    };

    function counterClicked(e) {
        const counter = e.target;
        const counterBlockUid = c3u.getUidOfContainingBlock(counter);
        let counterVal = parseInt(e.target.innerHTML);
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            counterVal--
        } else {
            counterVal++
        }
        counterVal = counterVal < 0 ? 0 : counterVal;
        e.target.innerHTML = counterVal; //to speed up the render update this first
        if (!counter.classList.contains('counter-observed')) {
            counterVanishObserver.observe(counter);
            counter.classList.add('counter-observed')
        }
    }

    function updateCounterString(entries) {
        entries.forEach((entry) => {
            if (entry.intersectionRatio < .5) {
                const blockUid = c3u.getUidOfContainingBlock(entry.target);
                const counterVal = entry.target.innerHTML;
                const replacement = c3u.blockString(blockUid).replace(/\]:*\s*\d*}}/, `]:${counterVal}}}`);
                c3u.updateBlockString(blockUid, replacement)
            }
        });
    }

    let options = {
        root: document.querySelector('.roam-app'),
        rootMargin: '0px',
        threshold: 1.0
    }
    counterVanishObserver = new IntersectionObserver(updateCounterString, options);
    setInterval(activateCounter, 1000);
}

function startC3TimerExtension() {
    var ccc = window.ccc || {};
    var c3u = ccc.util;
    segmentLogPage = 'roam/js/c3/timer/segmentlog'
    runningTimersLog = 'roam/js/c3/timer/running'
    runningPageUid = c3u.getOrCreatePageUid(runningTimersLog, 'Log of Running Timers');

    savedTime = {} //sum of all previously completed segments. maps uid => time
    totalElapsed = {} //savedTime + elapsed time of the current running segment. maps uid => time 
    tInterval = {} //intervals for each timer element (not uid). maps timer element id => interval
    uid2allElements = {} //maps uid => array of all corresponding html elements' id


    function activateTimers() {
        Array.from(document.getElementsByTagName('button'))
            .filter(btn => btn.textContent === "c3-timer")
            .forEach(timer => {
                if (timer.closest('.rm-zoom-item') !== null) {
                    timer.innerHTML = ''
                    timer.classList.add('timer-zoomed')
                } else {
                    if (!timer.classList.contains('timer-activated')) {
                        const isRef = timer.closest('.rm-block-ref');
                        const timerBlockUid = isRef ? isRef.dataset.uid : c3u.getUidOfContainingBlock(timer);
                        savedTime[timerBlockUid] = calcSavedElapsedTime(timerBlockUid) //save it in a map 
                        timer.id = "c3timer-" + timer.closest('.rm-block__input').id
                        const runningLog = readLatestStartTime(timerBlockUid)
                        if (!uid2allElements[timerBlockUid]) uid2allElements[timerBlockUid] = [];
                        if (uid2allElements[timerBlockUid].indexOf(timer.id) == -1)
                            uid2allElements[timerBlockUid].push(timer.id)
                        if (runningLog) { //isRunning
                            timer.classList.add('running');
                            const startTime = parseInt(c3u.allChildrenInfo(runningLog[0].uid)[0][0].children[0].string);
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
        const match = c3u.blockString(timerBlockUid).match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
        if (!match) return 0; //timer is not started. 
        const timerLogs = c3u.allChildrenInfo(match[1])[0][0].children;
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
        const timer = e.target;
        const timerBlockUid = c3u.getUidOfContainingBlock(timer);
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
        const match = c3u.blockString(timerBlockUid)
            .match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
        if (!match) return; //timer is not started. 
        c3u.openBlockInSidebar(match[1]);
    }

    function pauseAllTimerElements(timerBlockUid) {
        uid2allElements[timerBlockUid]
            .forEach(function (timerId, index, array) {
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

        c3u.deleteBlock(runningLog[0].uid)
        return runningLog;
    }


    function readLatestStartTime(timerBlockUid) {
        const allRunningTimers = c3u.allChildrenInfo(runningPageUid)[0][0].children;
        if (allRunningTimers === undefined) return false;
        const runningLog = allRunningTimers
            .map(function (x) { return (x.string === timerBlockUid) ? x : null; })
            .filter(t => t != null);
        return (runningLog.length != 0) ? runningLog : false;
    }

    function writeLatestStartTime(timerBlockUid, startTime) {
        const logUid = c3u.createUid();
        c3u.createChildBlock(runningPageUid, 1, timerBlockUid, logUid)
        c3u.createChildBlock(logUid, 0, startTime, c3u.createUid())
    }

    function writeSegmentLog(timerBlockUid, startTime, endTime) {
        //if !exist a log for the timer create one
        const match = c3u
            .blockString(timerBlockUid)
            .match(/.*{{\[\[c3-timer\]\]:\s*\(\((.........)\)\)}}.*/);
        let segmentUid;
        if (!match) {
            segmentUid = c3u.createUid();
            const today = new Date();
            c3u.createChildBlock(
                c3u.getPageUid(segmentLogPage + '/' + today.getFullYear() + '/' + today.getMonth(), 'Log of Stopped Timers'),
                1, timerBlockUid, segmentUid)
            const replacement = c3u.blockString(timerBlockUid).replace(']}}', ']:((' + segmentUid + '))}}');
            c3u.updateBlockString(timerBlockUid, replacement)
        } else {
            segmentUid = match[1]
        }
        c3u.createChildBlock(segmentUid, 0, new Date(startTime).toString().slice(4, 24) + ' > ' + new Date(endTime).toString().slice(4, 24), c3u.createUid())
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
        const allRunningTimers = c3u.allChildrenInfo(runningPageUid)[0][0].children;
        if (allRunningTimers === undefined) return false;
        const allRunningTimersUid = allRunningTimers.map(function (x) { return x.string; });

        allRunningTimersUid.forEach(runningUid => {
            if (c3u.isAncestor(runningUid, timerBlockUid) || c3u.isAncestor(timerBlockUid, runningUid)) {
                pauseTimer(runningUid)
            }
        })
    }

    function pauseTimer(timerBlockUid) {
        const endTime = new Date().getTime();
        savedTime[timerBlockUid] = totalElapsed[timerBlockUid];
        const runningLog = pauseAllTimerElements(timerBlockUid)
        const startTime = parseInt(c3u.blockString(c3u.getNthChildUid(runningLog[0].uid, 0)));
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

    setInterval(activateTimers, 1000);
}

