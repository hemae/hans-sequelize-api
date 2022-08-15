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
import {Router} from 'express'
import setAPI from 'any-init-api-file'


const addUserRules = {
    name: 'string|required',
    email: 'email|required'
}

const updateUserRules = {
    name: 'string',
    email: 'email'
}

const router = Router()

setAPI('User', router, {
    possibleMethods: ['gets', 'post', 'put', 'delete'],
    auth: ['post', 'put'],
    admin: ['delete'],
    validation: {post: addUserRules, put: updateUserRules},
    additionalMiddlewares: [
        {middleware: anyMiddleware, method: 'post'}
    ]
})

module.exports = router
```


