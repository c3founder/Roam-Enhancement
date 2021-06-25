var ccc = ccc || {};
ccc.util = ((c3u) => {
    ///////////////Front-End///////////////
    c3u.getUidOfContainingBlock = (el) => {
        return el.closest('.rm-block__input').id.slice(-9)
    }

    c3u.insertAfter = (newEl, anchor) => {
        anchor.parentElement.insertBefore(newEl, anchor.nextSibling)
    }

    c3u.getNthChildUid = (parentUid, order) => {
        const allChildren = c3u.allChildrenInfo(parentUid)[0][0].children;
        const childrenOrder = allChildren.map(function (child) { return child.order; });
        const index = childrenOrder.findIndex(el => el === order);
        return index !== -1 ? allChildren[index].uid : null;
    }

    c3u.sleep = m => new Promise(r => setTimeout(r, m))

    c3u.createPage = (pageTitle) => {
        let pageUid = c3u.createUid()
        const status = window.roamAlphaAPI.createPage(
            {
                "page":
                    { "title": pageTitle, "uid": pageUid }
            })
        return status ? pageUid : null
    }

    c3u.updateBlockString = (blockUid, newString) => {
        return window.roamAlphaAPI.updateBlock({
            block: { uid: blockUid, string: newString }
        });
    }

    c3u.hashCode = (str) => {
        let hash = 0, i, chr;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    c3u.createChildBlock = (parentUid, order, childString, childUid) => {
        return window.roamAlphaAPI.createBlock(
            {
                location: { "parent-uid": parentUid, order: order },
                block: { string: childString.toString(), uid: childUid }
            })
    }

    c3u.createUid = () => {
        return roamAlphaAPI.util.generateUID();
    }

    c3u.openBlockInSidebar = (blockUid) => {
        window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: "block", "block-uid": blockUid } })
    }

    ///////////////Back-End///////////////
    c3u.existBlockUid = (blockUid) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?block [:block/uid])
        :where
               [?block :block/uid \"${blockUid}\"]]`)
        return res.length ? blockUid : null
    }

    c3u.deleteBlock = (blockUid) => {
        return window.roamAlphaAPI.deleteBlock({ "block": { "uid": blockUid } });
    }

    c3u.parentBlockUid = (blockUid) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?parent [:block/uid])
        :where
            [?parent :block/children ?block]
               [?block :block/uid \"${blockUid}\"]]`)
        return res.length ? res[0][0].uid : null
    }

    c3u.blockString = (blockUid) => {
        return window.roamAlphaAPI.q(
            `[:find (pull ?block [:block/string])
        :where [?block :block/uid \"${blockUid}\"]]`)[0][0].string
    }

    c3u.allChildrenInfo = (blockUid) => {
        let results = window.roamAlphaAPI.q(
            `[:find (pull ?parent 
                [* {:block/children [:block/string :block/uid :block/order]}])
      :where
          [?parent :block/uid \"${blockUid}\"]]`)
        return (results.length == 0) ? undefined : results

    }

    c3u.queryAllTxtInChildren = (blockUid) => {
        return window.roamAlphaAPI.q(`[
      :find (pull ?block [
          :block/string
          :block/children
          {:block/children ...}
      ])
      :where [?block :block/uid \"${blockUid}\"]]`)
    }

    c3u.getPageUid = (pageTitle) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?page [:block/uid])
        :where [?page :node/title \"${pageTitle}\"]]`)
        return res.length ? res[0][0].uid : null
    }

    c3u.getOrCreatePageUid = (pageTitle, initString = null) => {
        let pageUid = c3u.getPageUid(pageTitle)
        if (!pageUid) {
            pageUid = c3u.createPage(pageTitle);
            if (initString)
                c3u.createChildBlock(pageUid, 0, initString, c3u.createUid());
        }
        return pageUid;
    }

    c3u.isAncestor = (a, b) => {
        const results = window.roamAlphaAPI.q(
            `[:find (pull ?root [* {:block/children [:block/uid {:block/children ...}]}])
            :where
                [?root :block/uid \"${a}\"]]`);
        if (!results.length) return false;
        let descendantUids = [];
        c3u.getUidFromNestedNodes(results[0][0], descendantUids)
        return descendantUids.includes(b);
    }

    c3u.getUidFromNestedNodes = (node, descendantUids) => {
        if (node.uid) descendantUids.push(node.uid)
        if (node.children)
            node.children.forEach(child => c3u.getUidFromNestedNodes(child, descendantUids))
    }    

    return c3u;
})(ccc.util || {});

