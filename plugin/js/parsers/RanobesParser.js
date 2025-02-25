"use strict";

parserFactory.register("ranobes.net", () => new RanobesParser());

class RanobesParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [...dom.querySelectorAll("ul.chapters-scroll-list a")]
            .map(a => ({
                sourceUrl:  a.href,
                title: a.querySelector(".title").textContent
            }));
        let tocUrl = dom.querySelector("div.r-fullstory-chapters-foot a[title='Go to table of contents']")?.href;
        if (tocUrl == null) {
            return chapters.reverse();
        }
        let tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        let urlsOfTocPages = RanobesParser.extractTocPageUrls(tocDom, tocUrl);
        return (await Parser.getChaptersFromAllTocPages(chapters, 
            this.extractPartialChapterList, urlsOfTocPages, chapterUrlsUI)).reverse();
    }

    static extractTocPageUrls(dom, baseUrl) {
        let max = RanobesParser.extractTocJson(dom)?.pages_count ?? 0;
        let tocUrls = [];
        for(let i = 2; i <= max; ++i) {
            tocUrls.push(`${baseUrl}page/${i}/`);
        }
        return tocUrls;
    }

    static extractTocJson(dom) {
        let startString = "window.__DATA__ = ";
        let scriptElement = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes(startString))[0];
        return (scriptElement != null)
            ? util.locateAndExtractJson(scriptElement.textContent, startString)
            : {chapters: [], pages_count: 0};
    }

    extractPartialChapterList(dom) {
        return RanobesParser.extractTocJson(dom).chapters.map(c => ({
            sourceUrl:  `https://ranobes.net/read-${c.id}.html`,
            title: c.title
        }));
    }

    findContent(dom) {
        return dom.querySelector("div#arrticle");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("h1.title");
        util.removeChildElementsMatchingCss(title, "span.subtitle, span[hidden]");
        return title;
    }

    findChapterTitle(dom) {
        let title = dom.querySelector("h1.title");
        util.removeChildElementsMatchingCss(title, "span, div");
        return title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.r-fullstory-poster");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div[itemprop='description']")];
    }
}
