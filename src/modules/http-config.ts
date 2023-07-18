export const HTTP_METHOD = {
  GET: 'GET',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
  PATCH: 'PATCH',
  POST: 'POST',
  PUT: 'PUT',
  TRACE: 'TRACE',
}

//Some common used http headers
export const HEADER = {
  CONTENT_TYPE: 'content-type',
}

//Some common used body content type
export const BODY_TYPE = {
  JSON: 'application/json',
  FORM_URL_ENCODED: 'application/x-www-form-urlencoded',
}

export function getResponseContentType(response: Response) {
  if (!response || !response.headers) return
  return response.headers?.get(HEADER.CONTENT_TYPE)
}

export function isJSONResponse(response: Response) {
  const type = getResponseContentType(response)
  if (!type) return false
  return type.indexOf(BODY_TYPE.JSON) >= 0
}
