[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Build Status](https://travis-ci.org/optics-team/prism-action-mapper.svg?branch=master)](https://travis-ci.org/optics-team/prism-action-mapper)
[![Coverage Status](https://coveralls.io/repos/github/optics-team/prism-action-mapper/badge.svg?branch=master)](https://coveralls.io/github/optics-team/prism-action-mapper?branch=master)

# Prism Action Mapper

A complimentary tool for Prism that reduces the boilerplate necessary to instantiate and configure Prism Resources and Actions against various database entities.

Instead of manually configuring each Action according to the entities they are are bound to, Prism Action Mapper consumes a single, declarative configuration object (called the 'Action Map') and does the tedious work for you.

## Usage

Install into your existing Prism project with:

```bash
$ npm install --save @optics/prism-action-mapper
```

Declare an Action Map and ActionMapper instance in your application:

```javascript
import {ActionMapper} from 'prism-action-mapper';

const ACTION_MAP = {
  'users': {
    backend: {}
  },
  
  'activity_feed': {
    readCollection: {
      options: {
        pageSize: 30
      },
      public: true
    }
  },
  
  'widgets': {
    readItem: {},
    readCollection: {}
  }
}

// `server` is the Hapi server instance that Prism is installed to
// `source` is the Prism `Source` instance that will be bound to created Actions
const actionMapper = new ActionMapper(server, source, ACITON_MAP);
```

Then, instead of directly instatiating Prism Actions and configuring them yourself (for example, when iterating through a [Collimator](https://github.com/radify/collimator) inspection result), simply use `ActionMapper#register()`:

```javascript
collimator.inspect(db)
  .then(schema => {
    schema.tables.forEach(table => {
      actionMapper.register(table);
    });

    schema.views.forEach(table => {
      actionMapper.register(table);
    });
  });
```

## Action Map

The Action Map is simply an object keyed by entity name, with each value being an object with the following (optional) properties:

- `resource` - Optional parameters to merge in when creating the underlying `Resource` object that will be bound to a new `Action`.
- `backend` - If specified, this entity will also be used to create and configure a `ResourceBackend` to be used for user authentication purposes
- `readItem`, `readCollection`, `createItem`, `updateItem`, `deleteItem` - Will create a correspding Prism Action bound to this database entity

With the exception of `resource`, each of these entries may also specify the following nested properties:
  - options - An `options` that will be passed to the Action or Backend constructor
  - merge - An object that will be merged with the Action or Backend instance that was created, but before it is registered against Prism

`readItem`, `readCollection`, `createItem`, `updateItem` and `deleteItem` also accept a `public` property. If `public` is `true`, then, the resultant route will be visible and usuable to anybody, even if not authenticated.
