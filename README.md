# gatsby-source-pocket

Fetch data from Pocket API.

An example site for this plugin is available:

- **[Demo](https://conradj.co.uk/weeklyreads/)**
- **[Example site source code](https://github.com/conradj/pocket-public-archive)**

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
        getCurrentWeekOnly: `n`,
        stateFilterString: "archive",
        tagFilter: false,
        tagFilterString: "_untagged_",
        favouriteFilter: false,
        favouriteFilterValue: 0,
        searchFilter: false,
        searchFilterString: "These 21 things",
        domainFilter: false,
        domainFilterString: "buzzfeed.com"
      }
    }
  ]
};
```

## Plugin Options

- **weeksOfHistory**: Number of weeks worth of articles to fetch
- **apiMaxRecordsToReturn**: Limit the number of records to return, to stop you hitting your [api limit](https://getpocket.com/developer/docs/rate-limits).
- **getCurrentWeekOnly**:
  - `n` will fetch data based on the settings above.
  - `y` returns the current week and the last week (it'll make sense when you try it).
- **stateFilterString**:
  - `unread` = only return unread items.
  - `archive` = only return archived items.
  - `all` = return both unread and archived items.
- **tagFilter**:
  - `true` will use the `tagFilterString` value to get articles with that tag.
  - `false` will ignore the `tagFilterString` value
- **tagFilterString**: If `tagFilter` is true then get articles tagged with this value. `'\_untagged\_'` will only return articles with no tags.
- **favouriteFilter** (note UK English spelling!):
  - `true` will use the `favouriteFilterValue` to get articles that have/have not been favourited in Pocket
  - `false` will ignore the `favouriteFilterValue`
- **favouriteFilterValue**:
  - `0` = only return un-favorited items
  - `1` = only return favorited items
- **searchFilter**:
  - `true` will use the `searchFilterString` value to get articles with that value in the URL or title.
  - `false` will ignore the `searchFilterString` value
- **searchFilterString**: If `searchFilter` is true then get articles with this value in the URL or title.
- **domainFilter**:
  - `true` will use the `domainFilterString` value to get articles for that domain.
  - `false` will ignore the `domainFilterString` value
- **domainFilterString**: If `domainFilter` is true then get articles from this domain.

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
        tags
        time_read
        readDay
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
