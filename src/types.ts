import type { Dayjs } from 'dayjs'

export type BasicObject = Record<string, unknown>
export type DayjsInputType = string | number | Date | Dayjs | null | undefined

// =====API RELATED=====
export type DefaultApiDataShape =
  | Record<string, unknown>
  | Array<unknown>
  | null
export type ApiResponse<T = DefaultApiDataShape> = {
  code: number
  message: string
  success?: boolean
  data?: T
}
export type ApiResponseWithPagination<T = BasicObject> = {
  total: number
  list: T[]
}
export type RequestResponse<DataShape = BasicObject> =
  | void
  | null
  | Response
  | DataShape
  | ApiResponse<DataShape>

// =====API RELATED END=====
