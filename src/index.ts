import {IRouter, Request, Response, Router} from 'express'
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
import {error500, status200, status201} from 'hans-http-handlers'
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

        return function setAPI(modelName: PostgreModelName, options: SetAPIOptions): IRouter {
            const router = Router()
            const possibleMethods = options?.possibleMethods || self._extendedMethods
            const isAuth = options?.auth || []
            const isAdmin = options?.admin || []
            const validation = options?.validation || {}
            const additionalMiddlewares = options?.additionalMiddlewares
            const controllers = self._getApiControllers(modelName)
            self._extendedMethods.forEach((myMethod, index) => {
                if (possibleMethods.includes(myMethod)) {
                    const middlewares: Handler[] = []
                    if (isAuth.includes(myMethod)) middlewares.push(authMiddleware)
                    if (isAdmin.includes(myMethod)) middlewares.push(adminMiddleware)
                    if (validation[myMethod]) middlewares.push(validationMiddleware(validation[myMethod] as ValidationRules))
                    const additionalMiddleware = additionalMiddlewares?.find(middleware => middleware.method === myMethod)
                    if (additionalMiddleware) middlewares.push(additionalMiddleware.middleware)
                    const [method, path] = self._getMethodAndPath(myMethod)
                    router[method](path, ...middlewares, controllers[myMethod])
                }
            })
            return router
        }
    }

    private _getEntities(modelName: PostgreModelName) {
        const self = this
        return async function (req: Request, res: Response): Promise<any> {
            try {
                const {
                    filters, sort, page,
                    pageSize, fields, relations, relationFields,
                    relationFilters, relationSort
                } = req.query as {
                    filters: Filters
                    sort: string
                    page: string, pageSize: string
                    fields: string[], relations: PostgreModelName[]
                    relationFields: Record<PostgreModelName, string[]>
                    relationFilters: Record<PostgreModelName, Filters>
                    relationSort: Record<PostgreModelName, string>
                }
                const pageSizeLocal = +(pageSize || 0) || 10
                const pageLocal = +(page || 0) || 1
                const entities = await self._postgreModels[modelName].findAndCountAll({
                    order: self._sort(sort),
                    where: self._filter({filters}),
                    attributes: fields,
                    include: self._getRelationsInclude({relations, relationFields, relationFilters, relationSort}),
                    limit: pageSizeLocal,
                    offset: (pageLocal - 1) * pageSizeLocal
                })
                const pageCount = Math.ceil(entities.count / pageSizeLocal)
                status200(res, {
                    data: entities.rows,
                    meta: {page: pageLocal, pageSize: pageSizeLocal, pageCount, total: entities.count}})
            } catch (e: any) {
                error500('api get entities', res, e, __filename)
            }
        }
    }

    private _getEntity(modelName: PostgreModelName) {
        const self = this
        return async function (req: Request, res: Response): Promise<any> {
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
                    attributes: fields,
                    include: self._getRelationsInclude({relations, relationFields, relationFilters, relationSort})
                })

                status200(res, entity || null)
            } catch (e: any) {
                error500('api get entity', res, e, __filename)
            }
        }
    }

    private _postEntity(modelName: PostgreModelName) {
        const self = this
        return async function (req: Request, res: Response): Promise<any> {
            try {
                const data = req.body
                const entity = await self._postgreModels[modelName].create(data)
                status201(res, entity)
            } catch (e: any) {
                error500('api post entity', res, e, __filename)
            }
        }
    }

    private _putEntity(modelName: PostgreModelName) {
        const self = this
        return async function (req: Request, res: Response): Promise<any> {
            try {
                const {id} = req.params
                const data = req.body
                //@ts-ignore
                const entity = await self._postgreModels[modelName].findOne({where: {id}})
                const updatedEntity = await entity?.update(data)
                status200(res, updatedEntity || null)
            } catch (e: any) {
                error500('api put entity', res, e, __filename)
            }
        }
    }

    private _deleteEntity(modelName: PostgreModelName) {
        const self = this
        return async function (req: Request, res: Response): Promise<any> {
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
                    attributes: fields,
                    include: self._getRelationsInclude({relations, relationFields, relationFilters, relationSort})
                })
                //@ts-ignore
                if (entity) await self._postgreModels[modelName].destroy({where: {id}})
                status200(res, entity || null)
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

    private _getApiControllers(modelName: PostgreModelName): Controllers {
        return {
            gets: this._getEntities(modelName),
            get: this._getEntity(modelName),
            post: this._postEntity(modelName),
            put: this._putEntity(modelName),
            delete: this._deleteEntity(modelName)
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
        relations.forEach(relation => {
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
