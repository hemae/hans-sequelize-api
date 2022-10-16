# hans-sequelize-api
rest-api form sequelize-express stack

Functional of the package is setting 5 main methods bound database model:
- get on / (returns {data: Entities[], meta: {page: number, pageSize: number, pageCount: number, total: number}});
- get on /:id (returns Entity);
- post on / (creates instance and returns Entity);
- put on /:id (updates instance and returns Entity);
- delete on /:id (deletes instance and returns Entity);

All methods allow query ([hans-sequelize-qs](https://www.npmjs.com/package/hans-sequelize-qs))

## Table of contents
* [Installing](#installing)
* [Example](#example)
* [Query parameters](#query-parameters)

<a name="installing"><h2>Installing</h2></a>
Add the package to your project
```
npm i hans-sequelize-api
```
using yarn
```
yarn add hans-sequelize-api
```


<a name="example"><h2>Example</h2></a>

Export SequelizeAPI from *hans-sequelize-api*

```javascript
const SequelizeAPI = require('hans-sequelize-api')
```
using TypeScript
```typescript
import SequelizeAPI from 'hans-sequelize-api'
```

In init api file
```typescript
type PostgreModelName = 'User' | 'Post'

const User = ... //sequelize model
const Post = ... //sequelize model

const sequelizeModels = { User, Post } 

const sequelizeAPI = new SequelizeAPI<PostgreModelName>(sequelizeModels)

const setAPI = sequelizeAPI.initializeAPI({
    authMiddleware: auth as HandlerType, // express middleware
    adminMiddleware: admin as HandlerType, // express middleware
    validationMiddleware: validator as (rules: ValidationRules) => HandlerType // function that's returns express middleware
})

export default setAPI
```

In routes file (for example *users.routes.ts*)

```typescript
import setAPI from 'any-init-api-file'


const addUserRules = {
    name: 'string|required',
    email: 'email|required'
}

const updateUserRules = {
    name: 'string',
    email: 'email'
}

module.exports = setAPI('User', router, {
    possibleMethods: ['gets', 'post', 'put', 'delete'],
    auth: ['post', 'put'],
    admin: ['delete'],
    validation: {post: addUserRules, put: updateUserRules},
    additionalMiddlewares: [
        {middleware: anyMiddleware, method: 'post'}
    ]
})
```

<a name="query-parameters"><h2>Query parameters</h2></a>

Query string general form is:

```
http://example-url/any-path?filters[<field-name>][operator]=<any-value>&page=<page-number>&pageSize=<items-count>
```

## Pagination

To specify page number you should use parameter *page*:

```
?page=5
```

To specify page size (items count by page) you should use parameter *pageSize*:

```
?pageSize=25
```

Full pagination query string turns to:

```
?page=5&pageSize=25
```

Default value of *page* is 1, *pageSize* is 10


## Fields

If we want to get items only with specified object fields we should use *fields* operator and provide an array:

```
?fields[0]=title&fields[1]=description
```

Let us have three items in database:

```json
[
  {
    "id": "1",
    "title": "The first element",
    "description": "The description of the first element",
    "publicVisible": true,
    "count": 4,
    "Items": [
      {
        "id": "101",
        "itemTitle": "Any 101 item title"
      }
    ]
  },
  {
    "id": "2",
    "title": "The second element",
    "description": "The description of the second element",
    "publicVisible": false,
    "count": 20,
    "Items": [
      {
        "id": "102",
        "itemTitle": "Any 102 item title"
      },
      {
        "id": "103",
        "itemTitle": "Any 103 item title"
      }
    ]
  },
  {
    "id": "3",
    "title": "Third element",
    "description": "The description of the third element",
    "publicVisible": true,
    "count": 50,
    "Items": [
      {
        "id": "101",
        "itemTitle": "Any 101 item title"
      },
      {
        "id": "102",
        "itemTitle": "Any 102 item title"
      },
      {
        "id": "103",
        "itemTitle": "Any 103 item title"
      }
    ]
  }
]
```

So we get:

```json
{
  "data": [
    {
      "title": "The first element",
      "description": "The description of the first element"
    },
    {
      "title": "The second element",
      "description": "The description of the second element"
    },
    {
      "title": "The third element",
      "description": "The description of the third element"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "pageCount": 1
  }
}
```

By default we get all object fields in items.

## Filtering

In this version we can use only first-level filtering.

And we want to get only elements with *publicVisible*=true and *title* starting with "The".
So we should provide following query parameters (using operator *and*):

```
?filters[and][0][title][startsWith]=The&filters[or][1][publicVisible][eq]=true
```

Then we get following response:

```json
{
  "data": [
    {
      "id": "1",
      "title": "The first element",
      "description": "The description of the first element",
      "publicVisible": true,
      "count": 4
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "pageCount": 1
  }
}
```

## Sort

To sort our items by id descending we should use query operator *sort*:

```
?sort=id:desc
```

Then we get:

```json
{
  "data": [
    {
      "id": "3",
      "title": "Third element",
      "description": "The description of the third element",
      "publicVisible": true,
      "count": 50
    },
    {
      "id": "2",
      "title": "The second element",
      "description": "The description of the second element",
      "publicVisible": false,
      "count": 20
    },
    {
      "id": "1",
      "title": "The first element",
      "description": "The description of the first element",
      "publicVisible": true,
      "count": 4
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "pageCount": 1
  }
}
```

## Relations

To get relations we can use operator *relations* and provide an array:

```
?relations[0]=Item
```

Note that we have to use relation name in single form.
So then get:

```json
{
  "data": [
    {
      "id": "1",
      "title": "The first element",
      "description": "The description of the first element",
      "publicVisible": true,
      "count": 4,
      "Items": [
        {
          "id": "101",
          "itemTitle": "Any 101 item title"
        }
      ]
    },
    {
      "id": "2",
      "title": "The second element",
      "description": "The description of the second element",
      "publicVisible": false,
      "count": 20,
      "Items": [
        {
          "id": "102",
          "itemTitle": "Any 102 item title"
        },
        {
          "id": "103",
          "itemTitle": "Any 103 item title"
        }
      ]
    },
    {
      "id": "3",
      "title": "Third element",
      "description": "The description of the third element",
      "publicVisible": true,
      "count": 50,
      "Items": [
        {
          "id": "101",
          "itemTitle": "Any 101 item title"
        },
        {
          "id": "102",
          "itemTitle": "Any 102 item title"
        },
        {
          "id": "103",
          "itemTitle": "Any 103 item title"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "pageCount": 1
  }
}
```

By default we get items without any relation

## Relation fields

To define object fields in relations we use *relationFields* operator:

```
?relations[0]=Item&relationFields[Item][0]=itemTitle
```

We get:

```json
{
  "data": [
    {
      "id": "1",
      "title": "The first element",
      "description": "The description of the first element",
      "publicVisible": true,
      "count": 4,
      "Items": [
        {
          "itemTitle": "Any 101 item title"
        }
      ]
    },
    {
      "id": "2",
      "title": "The second element",
      "description": "The description of the second element",
      "publicVisible": false,
      "count": 20,
      "Items": [
        {
          "itemTitle": "Any 102 item title"
        },
        {
          "itemTitle": "Any 103 item title"
        }
      ]
    },
    {
      "id": "3",
      "title": "Third element",
      "description": "The description of the third element",
      "publicVisible": true,
      "count": 50,
      "Items": [
        {
          "itemTitle": "Any 101 item title"
        },
        {
          "itemTitle": "Any 102 item title"
        },
        {
          "itemTitle": "Any 103 item title"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "pageCount": 1
  }
}
```

By default we get relation items with all object fields.
