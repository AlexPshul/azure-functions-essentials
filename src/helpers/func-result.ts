import { HttpResponseBodyInit } from '@azure/functions';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';

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
type StreamResponseBody = Exclude<HttpResponseBodyInit, string | null | undefined>;
type HttpChunk = string | Uint8Array;
type ExtractChunk<T> = (item: T) => HttpChunk | null | undefined;

const textEncoder = new TextEncoder();
const isBlob = (value: unknown): value is Blob => typeof Blob !== 'undefined' && value instanceof Blob;
const isFormData = (value: unknown): value is FormData => typeof FormData !== 'undefined' && value instanceof FormData;
const isAsyncIterable = <T = unknown>(value: unknown): value is AsyncIterable<T> =>
  typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
const isStreamResponseBody = (value: unknown): value is StreamResponseBody =>
  value instanceof Readable ||
  value instanceof ReadableStream ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value) ||
  value instanceof URLSearchParams ||
  isBlob(value) ||
  isFormData(value) ||
  isAsyncIterable<Uint8Array>(value);

async function* toHttpChunks<T>(source: AsyncIterable<T>, extractChunk: ExtractChunk<T>): AsyncIterable<Uint8Array> {
  for await (const item of source) {
    const chunk = extractChunk(item);
    if (chunk === undefined || chunk === null) continue;

    yield typeof chunk === 'string' ? textEncoder.encode(chunk) : chunk;
  }
}

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
 * @param source - An async iterable whose items should be converted into HTTP-safe chunks by `extractChunk`.
 * @param extractChunk - Extracts the actual text or bytes to emit for each source item. Return null or undefined to skip emitting a chunk for an item.
 * @returns The Azure function result object with the status code and the adapted stream body.
 */
export function funcResult<T>(
  status: HttpStatusCodeName,
  source: AsyncIterable<T>,
  extractChunk: ExtractChunk<T>,
): { status: number; body: AsyncIterable<Uint8Array> };
/**
 * A helper to easily create the current Azure function result object.
 * @param status - The HTTP status code name (e.g. 'OK', 'BadRequest', etc.)
 * @param message - A stream-capable HTTP response body supported by Azure Functions.
 * @returns The Azure function result object with the status code and the stream body.
 */
export function funcResult<TBody extends StreamResponseBody>(status: HttpStatusCodeName, message: TBody): { status: number; body: TBody };
/**
 * A helper to easily create the current Azure function result object.
 * @param status - The HTTP status code name (e.g. 'OK', 'BadRequest', etc.)
 * @param message - The **object** message to be returned in the body of the response as JSON.
 * @returns The Azure function result object with the status code and a JSON object body.
 */
export function funcResult<T>(status: HttpStatusCodeName, message: T): { status: number; jsonBody: T };

export function funcResult<T>(status: HttpStatusCodeName, message?: string | StreamResponseBody | T, extractChunk?: ExtractChunk<T>) {
  if (arguments.length === 1 || message === undefined) return { status: HttpStatusCode[status] };
  if (extractChunk && isAsyncIterable<T>(message)) return { status: HttpStatusCode[status], body: toHttpChunks(message, extractChunk) };
  if (typeof message === 'string' || isStreamResponseBody(message)) return { status: HttpStatusCode[status], body: message };

  return { status: HttpStatusCode[status], jsonBody: message };
}
