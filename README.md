# Turtle database scraper
This NodeJS app was created to scrape data from [TurtleWoW database](https://database.turtle-wow.org/) for the [pfQuest-turtle](https://github.com/shagu/pfQuest-turtle) addon.

## Install
You need NodeJS to run this app and `yarn` or `npm` to install dependencies.

1. Install dependencies:
    ```
    yarn
    // or
    npm install
    ```
1. Copy `pfQuest-turtle/db` folder and it's sub-folders to root of this project:
    ```
    \turtle-db-scraper
      \scripts
      \db
      package.json
    ```


## Usage

There are 4 `add:*` scripts you can use and they all accept an array of IDs of entities to import. Run them from command line using `yarn` or `npm`:

```
yarn add:quest 111 222
\\ or
npm run add:quest 111 222
```

So let's say we want to add the [The Unsent Letter](https://database.turtle-wow.org/?quest=373) quest chain, we need to run this command:

```
yarn add:quest 373
```

This will scrape info about this quest, all related items and npcs, and also all other quests in this chain.

### Flags

There are few flags that change the behavior of this tool:

- `--force`: Replaces existing entries without asking
- `--safe`: Skips existing entries without asking
- `--shallow`: Scrapes only given entity ids without related ones

## Sorting

You can use sort script to automatically sort all entries in all files by their id.

```
yarn sort:all
\\ or
npm run sort:all
```

## Limitations

The scraping process isn't perfect so you need to look out for the following:

- Sometimes npcs or items may have bugged pages on turtle database like f.e. [Quark](https://database.turtle-wow.org/?npc=80601)
- Related items like and special objectives that can may useful to show on map have to be added manually
- There is also no way of scraping `areatrigger` data