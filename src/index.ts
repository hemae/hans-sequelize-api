import {IRouter, NextFunction, Request, Response, Router} from 'express'
import {
    Controllers,
    Method,
    Path,
    Handler,
    ExtendedMethod,
    InitializeAPIOptions,
    SetAPIOptions,
    IncludeItem,
    GetRelationsIncludeOptions,
    PostgreModel,
    ValidationRules,
    FilterAllowedMethod,
    Filters,
    FilterBooleanOperator,
    FiltersSingle,
    FiltersMultiply,
    FilterOptions,
    Sort
} from './types'
import {error404, error500, status200, status201} from 'hans-http-handlers'
import {Op, WhereOptions} from 'sequelize'


export * from './types'

export default class SequelizeAPI<PostgreModelName extends string> {

    private _postgreModels: Record<PostgreModelName, PostgreModel>

    private _extendedMethods: ExtendedMethod[] = [
        'gets',
        'get',
        'post',
        'put',
        'delete'
    ]

    constructor(postgreModels: Record<PostgreModelName, PostgreModel>) {
        this._postgreModels = postgreModels
    }

    public initializeAPI(options: InitializeAPIOptions) {

        const {
            authMiddleware,
            adminMiddleware,
            validationMiddleware
        } = options

        const self = this

        return function setAPI(modelName: PostgreModelName, options?: SetAPIOptions<PostgreModelName>): IRouter {
            const router = Router()
            const possibleMethods = options?.possibleMethods || self._extendedMethods
            const isAuth = options?.auth || []
            const isAdmin = options?.admin || []
            const validation = options?.validation || {}
            const additionalMiddlewares = options?.additionalMiddlewares
            const afterMethods = options?.afterMethods
            const defaultFields = options?.defaultFields
            const defaultRelationFields = options?.defaultRelationFields
            const controllers = self._getApiControllers(modelName, this._mapIsAfterMethods(afterMethods), defaultFields, defaultRelationFields)
            self._extendedMethods.forEach((myMethod, index) => {
                if (possibleMethods.includes(myMethod)) {
                    const middlewares: Handler[] = []
                    if (isAuth.includes(myMethod)) middlewares.push(authMiddleware)
                    if (isAdmin.includes(myMethod)) middlewares.push(adminMiddleware)
                    if (validation[myMethod]) middlewares.push(validationMiddleware(validation[myMethod] as ValidationRules))
                    const additionalMiddleware = additionalMiddlewares?.find(middleware => middleware.method === myMethod)
                    if (additionalMiddleware) middlewares.push(additionalMiddleware.middleware)
                    const [method, path] = self._getMethodAndPath(myMethod)
                    let afterMethodsForAdd: Handler[] = []
                    if (afterMethods[myMethod]) {
                        if (Array.isArray(afterMethods[myMethod])) afterMethodsForAdd = afterMethods[myMethod]
                        else afterMethodsForAdd = [afterMethods[myMethod]]
                    }
                    router[method](path, ...middlewares, controllers[myMethod], ...afterMethodsForAdd)
                }
            })
            return router
        }
    }

    private _mapIsAfterMethods(afterMethods: Partial<Record<ExtendedMethod, Handler | Handler[]>>): Record<ExtendedMethod, boolean> {
        let isAfterMethods: Partial<Record<ExtendedMethod, boolean>> = {}
        this._extendedMethods.forEach(method => isAfterMethods[method] = !!afterMethods[method])
        return isAfterMethods as Record<ExtendedMethod, boolean>
    }

    private _getEntities(modelName: PostgreModelName, isAfterMethod: boolean, defaultFields?: string[], defaultRelationFields?: Record<PostgreModelName, string[]>) {
        const self = this
        return async function (req: Request, res: Response, next: NextFunction): Promise<any> {
            try {
                const {
                    filters, sort, page,
                    pageSize, fields, relations, relationFields,
                    relationFilters, relationSort
                } = req.query as {
                    filters?: Filters
                    sort?: string
                    page?: string, pageSize: string
                    fields?: string[], relations?: PostgreModelName[]
                    relationFields?: Record<PostgreModelName, string[]>
                    relationFilters?: Record<PostgreModelName, Filters>
                    relationSort?: Record<PostgreModelName, string>
                }
                const pageSizeLocal = +(pageSize || 0) || 10
                const pageLocal = +(page || 0) || 1
                const entities = await self._postgreModels[modelName].findAndCountAll({
                    order: self._sort(sort),
                    where: self._filter({filters}),
                    attributes: fields || defaultFields,
                    include: self._getRelationsInclude({
                        relations,
                        relationFields: relationFields || defaultRelationFields,
                        relationFilters,
                        relationSort
                    }),
                    limit: pageSizeLocal,
                    offset: (pageLocal - 1) * pageSizeLocal
                })
                const pageCount = Math.ceil(entities.count / pageSizeLocal)
                status200(res, {
                    data: entities.rows,
                    meta: {page: pageLocal, pageSize: pageSizeLocal, pageCount, total: entities.count}
                })
                if (isAfterMethod) next()
            } catch (e: any) {
                error500('api get entities', res, e, __filename)
            }
        }
    }

    private _getEntity(modelName: PostgreModelName, isAfterMethod: boolean, defaultFields?: string[], defaultRelationFields?: Record<PostgreModelName, string[]>) {
        const self = this
        return async function (req: Request, res: Response, next: NextFunction): Promise<any> {
            try {
                const {
                    fields, relations, relationFields,
                    relationFilters, relationSort
                } = req.query as {
                    fields?: string[], relations: PostgreModelName[]
                    relationFields?: Record<PostgreModelName, string[]>
                    relationFilters?: Record<PostgreModelName, Filters>
                    relationSort?: Record<PostgreModelName, string>
                }
                const {id} = req.params
                const entity = await self._postgreModels[modelName].findOne({
                    //@ts-ignore
                    where: {id},
                    attributes: fields || defaultFields,
                    include: self._getRelationsInclude({
                        relations,
                        relationFields: relationFields || defaultRelationFields,
                        relationFilters,
                        relationSort
                    })
                })
                if (!entity) return error404(res)
                status200(res, entity)
                if (isAfterMethod) next()
            } catch (e: any) {
                error500('api get entity', res, e, __filename)
            }
        }
    }

    private _postEntity(modelName: PostgreModelName, isAfterMethod: boolean, defaultFields?: string[], defaultRelationFields?: Record<PostgreModelName, string[]>) {
        const self = this
        return async function (req: Request, res: Response, next: NextFunction): Promise<any> {
            try {
                const {query, body} = req
                const {
                    fields, relations, relationFields,
                    relationFilters, relationSort
                } = query as {
                    fields?: string[], relations: PostgreModelName[]
                    relationFields?: Record<PostgreModelName, string[]>
                    relationFilters?: Record<PostgreModelName, Filters>
                    relationSort?: Record<PostgreModelName, string>
                }
                const entity = await self._postgreModels[modelName].create(body)
                let newEntity
                //@ts-ignore
                if (entity.dataValues.id) {
                    newEntity = await self._postgreModels[modelName].findOne({
                        //@ts-ignore
                        where: {id: entity.dataValues.id},
                        attributes: fields || defaultFields,
                        include: self._getRelationsInclude({
                            relations,
                            relationFields: relationFields || defaultRelationFields,
                            relationFilters,
                            relationSort
                        })
                    })
                } else {
                    delete body._userId
                    delete body._role
                    newEntity = await self._postgreModels[modelName].findOne({
                        where: body,
                        attributes: fields || defaultFields,
                        include: self._getRelationsInclude({
                            relations,
                            relationFields: relationFields || defaultRelationFields,
                            relationFilters,
                            relationSort
                        })
                    })
                }
                status201(res, newEntity)
                if (isAfterMethod) next()
            } catch (e: any) {
                error500('api post entity', res, e, __filename)
            }
        }
    }

    private _putEntity(modelName: PostgreModelName, isAfterMethod: boolean, defaultFields?: string[], defaultRelationFields?: Record<PostgreModelName, string[]>) {
        const self = this
        return async function (req: Request, res: Response, next: NextFunction): Promise<any> {
            try {
                const {query, body, params} = req
                const {
                    fields, relations, relationFields,
                    relationFilters, relationSort
                } = query as {
                    fields?: string[], relations: PostgreModelName[]
                    relationFields?: Record<PostgreModelName, string[]>
                    relationFilters?: Record<PostgreModelName, Filters>
                    relationSort?: Record<PostgreModelName, string>
                }
                const {id} = params
                //@ts-ignore
                const entity = await self._postgreModels[modelName].findOne({where: {id}})
                if (!entity) return error404(res)
                const updatedEntity = await entity?.update(body)
                let newEntity
                if (updatedEntity.getDataValue('id')) {
                    newEntity = await self._postgreModels[modelName].findOne({
                        //@ts-ignore
                        where: {id: updatedEntity.getDataValue('id')},
                        attributes: fields || defaultFields,
                        include: self._getRelationsInclude({
                            relations,
                            relationFields: relationFields || defaultRelationFields,
                            relationFilters,
                            relationSort
                        })
                    })
                } else {
                    delete body._userId
                    delete body._role
                    newEntity = await self._postgreModels[modelName].findOne({
                        where: body,
                        attributes: fields || defaultFields,
                        include: self._getRelationsInclude({
                            relations,
                            relationFields: relationFields || defaultRelationFields,
                            relationFilters,
                            relationSort
                        })
                    })
                }
                status200(res, newEntity)
                if (isAfterMethod) next()
            } catch (e: any) {
                error500('api put entity', res, e, __filename)
            }
        }
    }

    private _deleteEntity(modelName: PostgreModelName, isAfterMethod: boolean, defaultFields?: string[], defaultRelationFields?: Record<PostgreModelName, string[]>) {
        const self = this
        return async function (req: Request, res: Response, next: NextFunction): Promise<any> {
            try {
                const {
                    fields, relations, relationFields,
                    relationFilters, relationSort
                } = req.query as {
                    fields: string[], relations: PostgreModelName[]
                    relationFields: Record<PostgreModelName, string[]>
                    relationFilters: Record<PostgreModelName, Filters>
                    relationSort: Record<PostgreModelName, string>
                }
                const {id} = req.params
                const entity = await self._postgreModels[modelName].findOne({
                    //@ts-ignore
                    where: {id},
                    attributes: fields || defaultFields,
                    include: self._getRelationsInclude({
                        relations,
                        relationFields: relationFields || defaultRelationFields,
                        relationFilters,
                        relationSort
                    })
                })
                if (!entity) return error404(res)
                //@ts-ignore
                if (entity) await self._postgreModels[modelName].destroy({where: {id}})
                status200(res, entity)
                if (isAfterMethod) next()
            } catch (e: any) {
                error500('api delete entity', res, e, __filename)
            }
        }
    }

    private _getMethodAndPath(myMethod: ExtendedMethod, target: string = '/:id'): [Method, Path] {
        let method: Method
        let path: Path
        switch (myMethod) {
            case 'gets':
                method = 'get'
                path = '/'
                break
            case 'get':
                method = 'get'
                path = target
                break
            case 'post':
                method = 'post'
                path = '/'
                break
            case 'put':
                method = 'put'
                path = target
                break
            default:
                method = 'delete'
                path = target
        }
        return [method, path]
    }

    private _getApiControllers(modelName: PostgreModelName, isAfterMethods: Record<ExtendedMethod, boolean>, defaultFields?: Partial<Record<ExtendedMethod, string[]>>, defaultRelationFields?: Record<PostgreModelName, string[]>): Controllers {
        return {
            gets: this._getEntities(modelName, isAfterMethods.gets, defaultFields?.gets, defaultRelationFields),
            get: this._getEntity(modelName, isAfterMethods.get, defaultFields?.get, defaultRelationFields),
            post: this._postEntity(modelName, isAfterMethods.post, defaultFields?.post, defaultRelationFields),
            put: this._putEntity(modelName, isAfterMethods.put, defaultFields?.put, defaultRelationFields),
            delete: this._deleteEntity(modelName, isAfterMethods.delete, defaultFields?.delete, defaultRelationFields)
        }
    }

    // relations (associations)
    private _getRelationsInclude(options: GetRelationsIncludeOptions<PostgreModelName>): IncludeItem[] | undefined {
        const {
            relations,
            relationFields,
            relationFilters,
            relationSort
        } = options
        if (!relations) return undefined
        let include: IncludeItem[] = []
        const self = this
        relations?.forEach(relation => {
            const includeItem: IncludeItem = {model: this._postgreModels[relation as PostgreModelName]}
            if (relationFields && (relation in relationFields)) includeItem.attributes = relationFields[relation]
            if (relationFilters && (relation in relationFilters)) includeItem.where = self._filter({
                filters: relationFilters[relation]
            })
            if (relationSort && (relation in relationSort)) includeItem.order = self._sort(relationSort[relation])
            include.push(includeItem)
        })
        return include
    }

    // filtration
    private _filter(options: FilterOptions): WhereOptions<any> | undefined {

        const {
            filters
        } = options

        if (!filters) return undefined
        let where: WhereOptions<any> = {}

        const filterKeys = Object.keys(filters) as string[] | FilterAllowedMethod[]

        if (filterKeys.length > 1) throw new Error('Filters must have single root property')

        filterKeys.forEach(filterKey => {

            if (filterKey === 'or' || filterKey === 'and') {
                const booleanOperator = filterKey
                //@ts-ignore
                where[Op[booleanOperator as FilterBooleanOperator]] = (filters as FiltersMultiply)[booleanOperator].map(filterSingle => {
                    let obj = {}
                    Object
                        .keys(filterSingle)
                        .forEach(modelFieldName => {
                            const operatorNames = Object.keys((filterSingle as FiltersSingle)[modelFieldName]) as FilterAllowedMethod[]
                            operatorNames.forEach(operatorName => {
                                //@ts-ignore
                                obj[modelFieldName] = {
                                    [Op[operatorName as FilterAllowedMethod]]: (filterSingle as FiltersSingle)[modelFieldName][operatorName as FilterAllowedMethod]
                                }
                            })
                        })
                    return obj
                })
            } else {
                const modelFieldName = filterKey
                const operatorNames = Object.keys((filters as FiltersSingle)[modelFieldName]) as FilterAllowedMethod[]
                operatorNames.forEach(operatorName => {
                    //@ts-ignore
                    where[modelFieldName] = {
                        [Op[operatorName as FilterAllowedMethod]]: (filters as FiltersSingle)[modelFieldName][operatorName as FilterAllowedMethod]
                    }
                })
            }
        })
        return where
    }

    private _sort(sort?: string): [string, Sort][] | undefined {
        if (!sort) return undefined
        return [sort.split(':').reverse().map(el => {
            if (el === 'asc' || el === 'desc') return el.toUpperCase()
            else return el
        }) as [string, Sort]]
    }
}
