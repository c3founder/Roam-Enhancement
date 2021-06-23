(() => {
    ccc.util = {};

    ///////////////Front-End///////////////
    ccc.util.getUidOfContainingBlock = (el) => {
        return el.closest('.rm-block__input').id.slice(-9)
    }

    ccc.util.insertAfter = (newEl, anchor) => {
        anchor.parentElement.insertBefore(newEl, anchor.nextSibling)
    }

    ccc.util.getNthChildUid = (parentUid, order) => {
        const allChildren = allChildrenInfo(parentUid)[0][0].children;
        const childrenOrder = allChildren.map(function (child) { return child.order; });
        const index = childrenOrder.findIndex(el => el === order);
        return index !== -1 ? allChildren[index].uid : null;
    }

    ccc.util.sleep = m => new Promise(r => setTimeout(r, m))

    ccc.util.createPage = (pageTitle) => {
        let pageUid = createUid()
        const status = window.roamAlphaAPI.createPage(
            {
                "page":
                    { "title": pageTitle, "uid": pageUid }
            })
        return status ? pageUid : null
    }

    ccc.util.updateBlockString = (blockUid, newString) => {
        return window.roamAlphaAPI.updateBlock({
            block: { uid: blockUid, string: newString }
        });
    }

    ccc.util.hashCode = (str) => {
        let hash = 0, i, chr;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }



    ccc.util.createChildBlock = (parentUid, order, childString, childUid) => {
        return window.roamAlphaAPI.createBlock(
            {
                location: { "parent-uid": parentUid, order: order },
                block: { string: childString.toString(), uid: childUid }
            })
    }

    ccc.util.createUid = () => {
        return roamAlphaAPI.util.generateUID();
    }

    ///////////////Back-End///////////////
    ccc.util.existBlockUid = (blockUid) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?block [:block/uid])
        :where
               [?block :block/uid \"${blockUid}\"]]`)
        return res.length ? blockUid : null
    }

    ccc.util.parentBlockUid = (blockUid) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?parent [:block/uid])
        :where
            [?parent :block/children ?block]
               [?block :block/uid \"${blockUid}\"]]`)
        return res.length ? res[0][0].uid : null
    }

    ccc.util.blockString = (blockUid) => {
        return window.roamAlphaAPI.q(
            `[:find (pull ?block [:block/string])
        :where [?block :block/uid \"${blockUid}\"]]`)[0][0].string
    }

    ccc.util.allChildrenInfo = (blockUid) => {
        return window.roamAlphaAPI.q(
            `[:find (pull ?parent [* {:block/children [:block/string :block/uid :block/order]}])
      :where
          [?parent :block/uid \"${blockUid}\"]]`)
    }

    ccc.util.queryAllTxtInChildren = (blockUid) => {
        return window.roamAlphaAPI.q(`[
      :find (pull ?block [
          :block/string
          :block/children
          {:block/children ...}
      ])
      :where [?block :block/uid \"${blockUid}\"]]`)
    }

    ccc.util.getPageUid = (pageTitle) => {
        const res = window.roamAlphaAPI.q(
            `[:find (pull ?page [:block/uid])
        :where [?page :node/title \"${pageTitle}\"]]`)
        return res.length ? res[0][0].uid : null
    }



})();
