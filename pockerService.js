const GetPocket = require("node-getpocket");

function initPocketClient(consumerKey, accessToken) {
  if (!Boolean(consumerKey)) {
    throw new Error("consumerKey was not set");
  }
  if (!Boolean(accessToken)) {
    throw new Error("accessToken was not set");
  }

  return new GetPocket({
    consumer_key: consumerKey,
    access_token: accessToken,
  });
}

function fetchArticles(client, getParams) {
  return new Promise((resolve, reject) => {
    client.get(getParams, (err, resp) => {
      if (err) {
        return reject(err);
      }
      return resolve(resp);
    });
  });
}

module.exports = {
  initPocketClient,
  fetchArticles,
};
