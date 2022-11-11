import {NextFunction, Request, Response} from 'express'
import {Model, ModelCtor, ModelStatic, WhereOptions} from 'sequelize'


export type Handler = (req: Request, res: Response, next?: NextFunction) => Promise<any>
export type Controller = (req: Request, res: Response, next: NextFunction) => Promise<void>

export type Method =
    'get'
    | 'post'
    | 'put'
    | 'delete'

export type ExtendedMethod =
    'gets'
    | Method

export type Path = string

export type Controllers = Record<ExtendedMethod, Controller>


export type ValidationRules = Record<string, string>

export type InitializeAPIOptions = {
    authMiddleware: Handler
    adminMiddleware: Handler
    validationMiddleware: (rules: ValidationRules) => Handler
}

export type SetAPIOptions<PostgreModelName extends string> = {
    possibleMethods?: ExtendedMethod[]
    auth?: ExtendedMethod[]
    admin?: ExtendedMethod[]
    validation?: Partial<Record<ExtendedMethod, ValidationRules>>
    additionalMiddlewares?: {middleware: Handler, method: ExtendedMethod}[]
    defaultFields?: Partial<Record<ExtendedMethod, string[]>>
    defaultRelationFields?: Record<PostgreModelName, string[]>
    afterMethods?: Partial<Record<ExtendedMethod, Handler | Handler[]>>
} | void

export type Sort = 'ASC' | 'DESC'

export type IncludeItem = {
    model: ModelStatic<any>
    attributes?: string[]
    where?: WhereOptions<any>
    order?: [string, Sort][]
}

export type GetRelationsIncludeOptions<PostgreModelName extends string> = {
    relations?: PostgreModelName[]
    relationFields?: Record<PostgreModelName, string[]>
    relationFilters?: Record<PostgreModelName, Filters>
    relationSort?: Record<PostgreModelName, string>
}

export type PostgreModel<ModelType extends Model = Model> = ModelCtor<ModelType>


export type FilterBooleanOperator =
    'and'
    | 'or'

export type FilterEqualMethod =
    'eq'
    | 'ne'
    | 'is'
    | 'not'
    | 'col'

export type FilterNumericMethod =
    'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'notBetween'

export type FilterArrayMethod =
    'all'
    | 'in'
    | 'notIn'

export type FilterStringMethod =
    'like'
    | 'notLike'
    | 'startsWith'
    | 'endsWith'
    | 'substring'
    | 'iLike'
    | 'notILike'
    | 'regexp'
    | 'notRegexp'
    | 'iRegexp'
    | 'notIRegexp'

export type FilterMatchMethod =
    'any'
    | 'match'

export type FilterAllowedMethod =
    FilterBooleanOperator
    | FilterEqualMethod
    | FilterNumericMethod
    | FilterArrayMethod
    | FilterStringMethod
    | FilterMatchMethod

export type FiltersSingle = Record<string, Record<FilterAllowedMethod, string>>

export type FiltersMultiply = Record<FilterBooleanOperator, Record<string, Record<FilterAllowedMethod, string>>[]>

export type Filters = FiltersSingle | FiltersMultiply

export type FilterOptions = {
    filters?: Filters
    pageSize?: string
    page?: string
}
