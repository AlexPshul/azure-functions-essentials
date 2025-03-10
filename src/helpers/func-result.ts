// All HttpStatusCodes are from https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
const HttpStatusCode = {
  OK: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  URITooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HTTPVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
};

type HttpStatusCodeName = keyof typeof HttpStatusCode;

/**
 * A helper to easily create the current Azure function result object.
 * @param status - The HTTP status code name (e.g. 'OK', 'BadRequest', etc.)
 * @returns The Azure function result object with only the status code.
 */
export function funcResult(status: HttpStatusCodeName): { status: number };
/**
 * A helper to easily create the current Azure function result object.
 * @param status - The HTTP status code name (e.g. 'OK', 'BadRequest', etc.)
 * @param message - The **string** message to be returned in the body of the response.
 * @returns The Azure function result object with the status code and a message string body.
 */
export function funcResult(status: HttpStatusCodeName, message: string): { status: number; body: string };
/**
 * A helper to easily create the current Azure function result object.
 * @param status - The HTTP status code name (e.g. 'OK', 'BadRequest', etc.)
 * @param message - The **object** message to be returned in the body of the response as JSON.
 * @returns The Azure function result object with the status code and a JSON object body.
 */
export function funcResult<T>(status: HttpStatusCodeName, message: T): { status: number; jsonBody: T };

export function funcResult<T>(status: HttpStatusCodeName, message?: string | T) {
  if (!message) return { status: HttpStatusCode[status] };

  return typeof message === 'string' ? { status: HttpStatusCode[status], body: message } : { status: HttpStatusCode[status], jsonBody: message };
}
