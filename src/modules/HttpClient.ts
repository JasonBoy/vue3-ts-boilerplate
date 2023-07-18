/* eslint-disable no-prototype-builtins */
import {
  api,
  BASE_URL,
  formatRestfulUrl,
  numberOfRestParams,
  RestfulParamsInput,
} from './api-config.ts'
import {
  BODY_TYPE,
  HEADER,
  HTTP_METHOD,
  isJSONResponse,
} from './http-config.ts'
import { ApiResponse, RequestResponse } from '../types.ts'
import dayjs from 'dayjs'
import download from 'downloadjs'
import mime from 'mime'
import { DATETIME_FORMAT_NO_SPACE } from './constants.ts'

const CONTENT_TYPE_JSON = BODY_TYPE.JSON
const CONTENT_TYPE_FORM_URL_ENCODED = BODY_TYPE.FORM_URL_ENCODED
const defaultOptions: RequestInit = {
  credentials: 'same-origin',
}

export interface RequestOptions extends RequestInit {
  // 不要加前缀
  noPrefix?: boolean
  // api path的前缀，如 /platform/api
  apiPrefix?: string
  // 默认json, form=true时，body已 BODY_TYPE.FORM_URL_ENCODED 传
  form?: boolean
  // 非get/delete请求时，要传querystring, 通过options.qs 来传
  qs?: Record<string, unknown>
  /**
   * url上带 /:id/:id2 这种，传此参数替换, e.g:
   * http.get(api.DEMO_USER_INFO, { type: 1 }, { restParams: [10010, 'id_1000'] })
   */
  restParams?: RestfulParamsInput
  // 是否上传文件
  multipart?: boolean
  // 上传文件时的文件key, 默认file
  fileFieldName?: string
  raw?: boolean
}

/**
 * Send api requests
 */
class HttpClient {
  apiPrefix = ''
  noPrefix = false
  formURLEncoded = false
  options: RequestOptions = {}

  constructor(options: RequestOptions = {}) {
    if (!(this instanceof HttpClient)) {
      return new HttpClient(options)
    }

    //no api prefix for the instance
    this.noPrefix = !!options.noPrefix
    //set default api prefix
    this.apiPrefix = options.apiPrefix || ''

    const ops = { ...defaultOptions }

    this.formURLEncoded = !!options.form
    ops.headers = {
      [HEADER.CONTENT_TYPE]: this.formURLEncoded
        ? CONTENT_TYPE_FORM_URL_ENCODED
        : CONTENT_TYPE_JSON,
    }

    const { headers, ...restOptions } = options

    if (headers) {
      ops.headers = Object.assign({}, ops.headers, headers)
    }
    //set custom fetch options for the instance
    this.options = Object.assign(ops, restOptions)
  }

  jsonResponseHandler<DataShape>(
    data: ApiResponse<DataShape>,
    options: RequestOptions
  ) {
    if (!data) return null
    if (!data.success) {
      return Promise.reject(data)
    }
    return Promise.resolve(options.raw ? data : data.data)
  }

  normalizeUrl(input: RequestInfo | URL, options: RequestOptions) {
    if (input instanceof Request) {
      return input
    }
    let url = ''
    let objUrl
    if (input instanceof URL) {
      objUrl = input
    } else if (input.startsWith('http')) {
      objUrl = new URL(input)
    } else if (input.startsWith('//')) {
      objUrl = new URL(`${location.protocol}${input}`)
    }
    if (objUrl) {
      url = objUrl.toString()
    } else {
      url = input as string
    }
    //normalize rest params
    url = this.normalizeRestfulParams(url, options)
    //normalize prefix
    if (!objUrl && !options.noPrefix && !this.noPrefix) {
      url = this.getUrlWithPrefix(url)
      options.hasOwnProperty('noPrefix') && (options.noPrefix = undefined)
    }
    //normalize query string
    if (options.qs) {
      url = this.addQueryString(url, options.qs, undefined, false)
    }
    return url
  }

  /**
   * Send request now
   */
  async sendRequest<T = RequestResponse>(
    url: RequestInfo,
    options: RequestOptions = {}
  ): Promise<T> {
    url = this.normalizeUrl(url, options)
    //normalize headers
    const headers = {}
    const defaultHeaders = this.options.headers
    Object.assign(headers, defaultHeaders, options.headers)
    options.headers = undefined
    const apiOptions = Object.assign({}, this.options, options, { headers })
    if (apiOptions.multipart) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete apiOptions.headers[HEADER.CONTENT_TYPE]
    }
    const response = await fetch(url, apiOptions)
    if (!response.ok) {
      console.error(`[API-ERROR]-[${response.status}]-[${url}]`)
      if ([403, 401].includes(response.status)) {
        return this.handleUnauthorized(url, apiOptions, response)
      }
      return Promise.reject(response)
    }
    if (response.status === 204) {
      return Promise.resolve() as T
    }
    if (isJSONResponse(response)) {
      return response
        .json()
        .catch((err) => {
          console.error(err)
          return Promise.reject(err)
        })
        .then((data) => this.jsonResponseHandler<T>(data, options)) as T
    }
    return Promise.resolve(response) as T
  }

  /**
   * Add query to the current url
   * @param {string} url - current url
   * @param {object} query - query object which will be added
   * @param {string=} baseUrl - baseUrl
   * @param {boolean=} noHost - return the url without the host, default true
   * @return {string} - new url string
   */
  addQueryString(
    url: string,
    query?: Record<string, unknown>,
    baseUrl: string = location.origin,
    noHost = true
  ) {
    if (!query) return url
    const obj = new URL(url, baseUrl)
    for (const key of Object.keys(query)) {
      const value = query[key]
      if (value === undefined || value === null) continue
      obj.searchParams.append(
        key,
        'object' === typeof value ? JSON.stringify(value) : String(value)
      )
    }
    if (!noHost) {
      return obj.toString()
    }

    return `${obj.pathname}${obj.search}${obj.hash}`
  }

  /**
   * Get method
   * @param {string} url api url config
   * @param {object=} querystring - query strings in object
   * @param {object=} options
   * @return {Promise}
   */
  get<DataShape>(url: string, querystring = {}, options = {}) {
    const getOptions = Object.assign(
      {
        method: HTTP_METHOD.GET,
        qs: querystring,
      },
      options
    )
    return this.sendRequest<DataShape>(url, getOptions)
  }

  post<DataShape>(url: string, data = {}, options = {}) {
    return this.sendRequestWithBody<DataShape>(
      url,
      data,
      HTTP_METHOD.POST,
      options
    )
  }

  put(url: string, data = {}, options = {}) {
    return this.sendRequestWithBody(url, data, HTTP_METHOD.PUT, options)
  }

  patch(url: string, data = {}, options = {}) {
    return this.sendRequestWithBody(url, data, HTTP_METHOD.PATCH, options)
  }

  delete(url: string, querystring = {}, options = {}) {
    const getOptions = Object.assign(
      {
        method: HTTP_METHOD.DELETE,
        qs: querystring,
      },
      options
    )
    return this.sendRequest(url, getOptions)
  }

  /**
   * Send request with http body, will normalize body before sending
   * @param url
   * @param body
   * @param method
   * @param options
   * @returns {Promise<Response|Object>}
   */
  sendRequestWithBody<T>(
    url: string,
    body: Record<string, undefined>,
    method: string,
    options: RequestOptions
  ) {
    const sendOptions = Object.assign(
      {
        method,
        body: this.normalizeBodyData(body),
      },
      options
    )
    return this.sendRequest<T>(url, sendOptions)
  }

  /**
   * Upload files
   * @param {string} url - upload url
   * @param {Array|Object} files - files in array or in object where key is the file field name
   * @param {Object} extraData - extra body data
   * @param {Object} options - other request options
   * @return {Promise<Response|Object>}
   */
  upload<DataShape>(
    url: string,
    files: Array<File> | Record<string, File | File[]>,
    // 除了文件外其他数据
    extraData?: Record<string, undefined>,
    options: RequestOptions = {}
  ) {
    const formData = new FormData()
    if (extraData) {
      for (const key of Object.keys(extraData)) {
        formData.append(key, String(extraData[key]))
      }
    }
    if (Array.isArray(files)) {
      const fileFieldName = options.fileFieldName || 'file'
      let i = 0
      for (; i < files.length; i++) {
        formData.append(fileFieldName, files[i])
      }
    } else {
      for (const key of Object.keys(files)) {
        let value = files[key]
        if (!Array.isArray(value)) {
          value = [value]
        }
        value.forEach((v) => formData.append(key, v))
      }
    }

    const apiOptions = Object.assign(
      {
        method: HTTP_METHOD.POST,
        body: formData,
        multipart: true,
      },
      defaultOptions,
      options
    )
    return this.sendRequest<DataShape>(url, apiOptions)
  }

  /**
   *
   * @param res
   * @param filename
   * @param filenameWithoutExt - 传进来的filename没有ext
   */
  async download(
    res: Response,
    filename?: string,
    filenameWithoutExt?: boolean
  ) {
    const blob = await res.blob()
    const type = res.headers.get('content-type')?.split(';')[0]
    //e.g: content-disposition: attachment; filename=warehouse-notice-590151221826813952.pdf
    if (!filename) {
      const contentDisposition = res.headers.get('content-disposition')
      const resFileName = contentDisposition
        ?.split(';')[1]
        ?.trim()
        .split('=')[1]
      if (resFileName) {
        filename = resFileName
      } else {
        filename = `dl_${dayjs().format(DATETIME_FORMAT_NO_SPACE)}`
      }
    } else {
      if (filenameWithoutExt) {
        filename = `${filename}.${mime.getExtension(type)}`
      }
    }
    // console.log('filename: ', filename)
    download(blob, filename, type)
  }

  /**
   * Get the query from url
   * @param url
   * @param baseUrl
   * @return {object} - parsed query string
   */
  getQueryString(url = location.href, baseUrl = location.origin) {
    const obj = new URL(url, baseUrl)
    const query: { [index: string]: unknown } = {}
    for (const [key, value] of obj.searchParams.entries()) {
      if (query.hasOwnProperty(key)) {
        const queryValue = query[key]
        if (Array.isArray(queryValue)) {
          query[key] = [...queryValue, value]
        } else {
          query[key] = [queryValue, value]
        }
      } else {
        query[key] = value
      }
    }
    return query
  }

  /**
   * Remove the hash from url
   * @param url
   * @param baseUrl
   * @return {string} - new url without the hash
   */
  stripUrlHash(url: string, baseUrl = location.origin) {
    const u = new URL(url, baseUrl)
    u.hash = ''
    return u.toString()
  }

  normalizeRestfulParams(url: string, options: RequestOptions) {
    const restLength = numberOfRestParams(url)
    const restParams = options.restParams || []
    if (restLength > 0) {
      url = formatRestfulUrl(url, restParams)
    }
    return url
  }

  formatFormUrlEncodeData(data: Record<string, unknown>) {
    const params = new URLSearchParams()
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        params.append(key, String(data[key]))
      }
    }
    return params.toString()
  }

  normalizeBodyData(data = {}) {
    return this.formURLEncoded
      ? this.formatFormUrlEncodeData(data)
      : JSON.stringify(data)
  }

  getUrlWithPrefix(path: string) {
    return `${this.apiPrefix}${path}`
  }

  handleUnauthorized(
    url: RequestInfo,
    apiOptions: RequestOptions,
    response: Response
  ) {
    console.log('url: ', url, apiOptions, response)
    // if (url instanceof Request) {
    //   url = url.url
    // }
    this.gotoLogin()
    return Promise.reject()
  }

  gotoLogin(noFrom?: boolean) {
    location.href = `${location.pathname}#/login${
      noFrom ? '' : `?from=${encodeURIComponent(location.href)}`
    }`
  }
}

const http = new HttpClient({
  apiPrefix: BASE_URL,
  // default using "application/json"
  // form: true,
})

export { http, api, HttpClient }
