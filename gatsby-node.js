const pocketService = require('./pockerService');
const startOfDay = require('date-fns/startOfDay');
const startOfWeek = require('date-fns/startOfWeek');
const format = require('date-fns/format');
const subWeeks = require('date-fns/subWeeks');
const { URL } = require('url');

function getUnixTimeToGetArticlesFrom(pluginOptions) {
  // get the data since the last time it was run, or from the earliest week
  let lastGeneratedDateStamp = subWeeks(
    startOfWeek(new Date()),
    pluginOptions.weeksOfHistory
  );

  // override - usually used in prod just to update current and last week on a nightly update after the first full generation.
  if (pluginOptions.getCurrentWeekOnly.toLowerCase() === 'y') {
    lastGeneratedDateStamp = startOfWeek(subWeeks(new Date(), 1));
  }

  const unixTimeToGetArticlesFrom = parseInt(
    Date.parse(lastGeneratedDateStamp) / 1000
  );

  if (isNaN(unixTimeToGetArticlesFrom)) {
    throw new Error('set a pocket start date in options');
  }

  return unixTimeToGetArticlesFrom;
}

function getApiParamOptions(unixTimeToGetArticlesFrom, pluginOptions) {
  // get/retrieve/search parameters.
  // See https://getpocket.com/developer/docs/v3/retrieve for full list of available params.
  let params = {
    sort: 'newest',
    count: parseInt(pluginOptions.apiMaxRecordsToReturn),
    detailType: 'complete',
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

const POCKET_ARTICLE_NODE_TYPE = 'PocketArticle';

exports.sourceNodes = async (
  { actions, createNodeId, createContentDigest, getNodesByType, reporter },
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

  // Fetch up to apiMaxRecordsToReturn from Pocket API. If more than maxItemsToFetchInOneCall, do it in several requests.
  var done = false;
  var i = 0;
  var itemsFetched = 0;
  var maxItemsToFetchInOneCall = 5000;
  var totalItemsToFetch = pocketCallParams.count;
  if (totalItemsToFetch > maxItemsToFetchInOneCall) {
    // apiMaxRecordsToReturn (= pocketCallParams.count) contains the TOTAL number of items to be returned.
    // So if it's higher than maxItemsToFetchInOneCall, adjust the number of items to fetch per call.
    pocketCallParams.count = maxItemsToFetchInOneCall;
  }
  var allFetchedItems = {};
  while (done === false) {
    pocketCallParams.sort = 'newest';
    pocketCallParams.offset = i * maxItemsToFetchInOneCall;
    var resp = await pocketService
      .fetchArticles(pocketClient, pocketCallParams)
      .catch((e) => console.log(e));
    if (Object.keys(resp.list).length === 0) {
      done = true;
    } else {
      allFetchedItems = Object.assign(allFetchedItems, resp.list);
    }
    itemsFetched = itemsFetched + Object.keys(resp.list).length;
    if (itemsFetched >= totalItemsToFetch) done = true;
    i++;
  }
  // Put the result in property "list" of object "resp".
  resp = { list: allFetchedItems };
  reporter.info(
    '[gatsby-source-pocket] Fetched ' +
      Object.keys(allFetchedItems).length +
      ' Pocket items'
  );

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
      : '';

    const tags = datum.tags ? Object.keys(datum.tags) : [];

    const readDay = datum.time_read
      ? parseInt(
          format(startOfDay(new Date(parseInt(datum.time_read) * 1000)), 'X')
        )
      : 0;

    const readWeek = datum.time_read
      ? parseInt(
          format(startOfWeek(new Date(parseInt(datum.time_read) * 1000)), 'X')
        )
      : 0;

    createNode({
      id: createNodeId(`${POCKET_ARTICLE_NODE_TYPE}-${datum.item_id}`),
      readDay: readDay,
      readWeek: readWeek,
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
