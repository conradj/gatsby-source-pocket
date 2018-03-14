# gatsby-source-pocket

Fetch data from Pocket API.

An example site for this plugin is available:

* **[Demo](https://conradj.co.uk/weeklyreads/)**
* **[Example site source code](https://github.com/conradj/pocket-public-archive)**

## How to Use

1.  `npm install --save gatsby-source-pocket`

2.  Go to https://getpocket.com/developer/ and create a new app to get your consumer key.

3.  Run `node node_modules/node-getpocket/authorise --consumerkey 'YOUR-CONSUMER-KEY'` and point your browser to http://127.0.0.1:8080to get your `POCKET_ACCESS_TOKEN` string.

    For more info on this process see https://github.com/vicchi/node-getpocket, which this plugin uses to talk to the Pocket API.

4.  In your gatsby-config.js

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-pocket`,
      options: {
        consumerKey: INSERT_HERE_YOUR_POCKET_CONSUMER_KEY,
        accessToken: INSERT_HERE_YOUR_POCKET_ACCESS_TOKEN,
        weeksOfHistory: 52,
        apiMaxRecordsToReturn: 3000,
        getCurrentWeekOnly: `n`
      }
    }
  ]
};
```

## Plugin Options

* **weeksOfHistory**: Number of weeks worth of articles to fetch
* **apiMaxRecordsToReturn**: Limit the number of records to return, to stop you hitting your [api limit](https://getpocket.com/developer/docs/rate-limits).
* **getCurrentWeekOnly**: `n` will fetch data based on the settings above. `y` returns the current week and the last week (it'll make sense when you try it).

## How to query your Pocket articles data using GraphQL

Below is a sample query for fetching all Article nodes.

```graphql
query PageQuery {
  allPocketArticle(sort: { fields: readWeek }) {
    edges {
      node {
        id
        url
        title
        favourite
        excerpt
        is_article
        is_index
        has_video
        has_image
        word_count
        time_read
        readWeek
        articleDomain
        domainFavicon
        image {
          item_id
          src
          width
          height
        }
      }
    }
  }
}
```
