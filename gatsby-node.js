const pocketService = require("./pockerService");
const startOfDay = require("date-fns/startOfDay");
const startOfWeek = require("date-fns/startOfWeek");
const format = require("date-fns/format");
const subWeeks = require("date-fns/subWeeks");
const { URL } = require("url");

function getUnixTimeToGetArticlesFrom(pluginOptions) {
  // get the data since the last time it was run, or from the earliest week
  let lastGeneratedDateStamp = subWeeks(
    startOfWeek(new Date()),
    pluginOptions.weeksOfHistory
  );

  // override - usually used in prod just to update current and last week on a nightly update after the first full generation.
  if (pluginOptions.getCurrentWeekOnly.toLowerCase() === "y") {
    lastGeneratedDateStamp = startOfWeek(subWeeks(new Date(), 1));
  }

  const unixTimeToGetArticlesFrom = parseInt(
    Date.parse(lastGeneratedDateStamp) / 1000
  );

  if (isNaN(unixTimeToGetArticlesFrom)) {
    throw new Error("set a pocket start date in options");
  }

  return unixTimeToGetArticlesFrom;
}

function getApiParamOptions(unixTimeToGetArticlesFrom, pluginOptions) {
  // get/retrieve/search parameters.
  // See https://getpocket.com/developer/docs/v3/retrieve for full list of available params.
  let params = {
    sort: "newest",
    count: parseInt(pluginOptions.apiMaxRecordsToReturn),
    detailType: "complete",
    state: pluginOptions.stateFilterString,
    since: unixTimeToGetArticlesFrom,
  };

  // now do optional parameters
  if (pluginOptions.tagFilter) {
    params.tag = pluginOptions.tagFilterString;
  }

  if (pluginOptions.favouriteFilter) {
    params.favorite = pluginOptions.favouriteFilterValue;
  }

  if (pluginOptions.tagFilter) {
    params.tag = pluginOptions.tagFilterString;
  }

  if (pluginOptions.searchFilter) {
    params.search = pluginOptions.searchFilterString;
  }

  if (pluginOptions.domainFilter) {
    params.domain = pluginOptions.domainFilterString;
  }
  return params;
}

function pocketResponseToArticlesArray(pocketApiResults) {
  return Object.keys(pocketApiResults.list).map(
    (value) => pocketApiResults.list[value]
  );
}

const POCKET_ARTICLE_NODE_TYPE = "PocketArticle";

exports.sourceNodes = async (
  { actions, createNodeId, createContentDigest, getNodesByType },
  pluginOptions
) => {
  const { createNode, touchNode } = actions;

  getNodesByType(POCKET_ARTICLE_NODE_TYPE).forEach((node) => touchNode(node));

  const pocketClient = pocketService.initPocketClient(
    pluginOptions.consumerKey,
    pluginOptions.accessToken
  );

  const pocketCallParams = getApiParamOptions(
    getUnixTimeToGetArticlesFrom(pluginOptions),
    pluginOptions
  );

  const resp = await pocketService
    .fetchArticles(pocketClient, pocketCallParams)
    .catch((e) => console.log(e));

  const data = pocketResponseToArticlesArray(resp);

  data.forEach((datum) => {
    const image =
      datum.has_image && datum.image
        ? {
            item_id: datum.item_id,
            src: datum.image.src,
            width: datum.image.width,
            height: datum.image.height,
          }
        : null;

    const articleDomain = Boolean(datum.resolved_url)
      ? new URL(datum.resolved_url).hostname
      : "";

    const tags = datum.tags ? Object.keys(datum.tags) : [];

    createNode({
      id: createNodeId(`${POCKET_ARTICLE_NODE_TYPE}-${datum.item_id}`),
      readDay: parseInt(
        format(startOfDay(new Date(parseInt(datum.time_read) * 1000)), "X")
      ),
      readWeek: parseInt(
        format(startOfWeek(new Date(parseInt(datum.time_read) * 1000)), "X")
      ),
      url: datum.resolved_url,
      title: datum.resolved_title,
      articleDomain: articleDomain,
      domainFavicon: `https://s2.googleusercontent.com/s2/favicons?domain_url=${articleDomain}`,
      favourite: datum.favorite == true,
      favorite: datum.favorite == true,
      excerpt: datum.excerpt,
      is_article: datum.is_article == true,
      is_index: datum.is_index == true,
      has_video: datum.has_video == true,
      has_image: datum.has_image == true,
      word_count: parseInt(datum.word_count),
      tags: tags,
      time_added: datum.time_added,
      time_updated: datum.time_updated,
      time_read: parseInt(datum.time_read),
      image: image,
      // Required fields.
      parent: null, //`the-id-of-the-parent-node`, // or null if it's a source node without a parent
      children: [],
      internal: {
        type: POCKET_ARTICLE_NODE_TYPE,
        contentDigest: createContentDigest(datum),
        content: JSON.stringify(datum), // optional
      },
    });
  });
};
