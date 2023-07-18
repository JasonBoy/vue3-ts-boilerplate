export const BASE_URL = import.meta.env.VITE_API_ENDPOINT || ''

export const api = {
  // demo
  DEMO_USER_INFO: '/user/:id/detail/:id2',
  ACCOUNT_INFO: '/user/info',
}

export type RestfulParamsInput =
  | Array<string | number>
  | Record<string, unknown>

/**
 * Simplify the rest parameters creation, e.g:
 * //NOTICE: order of params in array is important, params use object do not care about order
 * formatRestfulUrl('/user/:id/:id2', [1,2]) ->  /user/1/2
 * formatRestfulUrl('/user/:id/:id2', {id2: 2, id: 1}) ->  /user/1/2
 */
export function formatRestfulUrl(url: string, params: RestfulParamsInput) {
  if (!params || url.indexOf(':') < 0) return url
  const parts = url.split('/')
  let partIndex = 0
  const isArray = Array.isArray(params)
  parts.forEach(function (ele, index) {
    if (ele.indexOf(':') === 0) {
      parts[index] = (
        isArray ? params[partIndex] : params[ele.substring(1)]
      ) as string
      partIndex++
    }
  })
  return parts.join('/')
}

/**
 * Check the number of rest params in the current url definition
 */
export function numberOfRestParams(url: string) {
  const matched = url.match(/\/:/g)
  return matched ? matched.length : 0
}
