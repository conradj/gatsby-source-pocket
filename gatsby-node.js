const startOfDay = require("date-fns/start_of_day");
const startOfWeek = require("date-fns/start_of_week");
const format = require("date-fns/format");
const subWeeks = require("date-fns/sub_weeks");
const getTime = require("date-fns/get_time");
const { URL } = require("url");
const crypto = require("crypto");

const createContentDigest = obj =>
  crypto
    .createHash("md5")
    .update(JSON.stringify(obj))
    .digest("hex");

function getPocketArticles(sinceDate, pluginOptions) {
  return new Promise((resolve, reject) => {
    const GetPocket = require("node-getpocket");
    const config = {
      consumer_key: pluginOptions.consumerKey,
      access_token: pluginOptions.accessToken
    };
    const pocket = new GetPocket(config);
    let lastGeneratedDateStamp = sinceDate;

    // override - usually used in prod just to update current and last week on a nightly update after the first full generation.
    if (pluginOptions.getCurrentWeekOnly.toLowerCase() === "y") {
      lastGeneratedDateStamp = startOfWeek(subWeeks(new Date(), 1));
    }

    const unixTimeToGetArticlesFrom = parseInt(
      Date.parse(lastGeneratedDateStamp) / 1000
    );

    if (isNaN(unixTimeToGetArticlesFrom)) {
      reject("set a pocket start date in options");
    }

    const params = getApiParamOptions(pluginOptions, unixTimeToGetArticlesFrom);

    pocket.get(params, function(err, resp) {
      // check err or handle the response
      if (err) {
        reject(err);
      }
      resolve(convertResultsToArticlesArray(resp));
    });
  });
}

function getApiParamOptions(pluginOptions, unixTimeToGetArticlesFrom) {
  // get/retrieve/search parameters.
  // See https://getpocket.com/developer/docs/v3/retrieve for full list of available params.

  let params = {
    sort: "newest",
    count: parseInt(pluginOptions.apiMaxRecordsToReturn),
    detailType: "complete",
    state: pluginOptions.stateFilterString,
    since: unixTimeToGetArticlesFrom
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

function convertResultsToArticlesArray(pocketApiResults) {
  return Object.keys(pocketApiResults.list).map(function(value, articleIndex) {
    return pocketApiResults.list[value];
  });
}

exports.sourceNodes = async ({ actions }, pluginOptions) => {
  const importStartDate = subWeeks(
    startOfWeek(new Date()),
    pluginOptions.weeksOfHistory
  );

  const { createNode, touchNode } = actions;
  // get the data since the last time it was run, or from the earliest week
  const data = await getPocketArticles(importStartDate, pluginOptions);

  // Process data into nodes.
  data.forEach(datum => {
    const image =
      datum.has_image && datum.image
        ? {
            item_id: datum.item_id,
            src: datum.image.src,
            width: datum.image.width,
            height: datum.image.height
          }
        : null;

    const articleDomain =
      datum.resolved_url && datum.resolved_url !== ""
        ? new URL(datum.resolved_url).hostname
        : "";

    const tags = datum.tags ? Object.keys(datum.tags) : [];

    const node = createNode({
      // Data for the node.
      id: datum.item_id,
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
        type: `PocketArticle`,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(datum))
          .digest(`hex`),
        content: JSON.stringify(datum) // optional
      }
    });

    touchNode({ nodeId: datum.item_id });
  });
};
