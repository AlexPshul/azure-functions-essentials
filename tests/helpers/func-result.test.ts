import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import { funcResult } from '../../src/helpers/func-result';

describe('funcResult', () => {
  it('should return the correct status code without a message', () => {
    const result = funcResult('OK');
    expect(result).toEqual({ status: 200 });
  });

  it('should preserve an empty string body', () => {
    const result = funcResult('OK', '');
    expect(result).toEqual({ status: 200, body: '' });
  });

  it('should return the correct status code and string message', () => {
    const result = funcResult('BadRequest', 'Invalid request');
    expect(result).toEqual({ status: 400, body: 'Invalid request' });
  });

  it('should return the correct status code and JSON object message', () => {
    const message = { error: 'Invalid request' };
    const result = funcResult('BadRequest', message);
    expect(result).toEqual({ status: 400, jsonBody: message });
  });

  it('should return the correct status code for different status', () => {
    const result = funcResult('NotFound');
    expect(result).toEqual({ status: 404 });
  });

  it('should return the correct status code and string message for different status', () => {
    const result = funcResult('Unauthorized', 'Unauthorized access');
    expect(result).toEqual({ status: 401, body: 'Unauthorized access' });
  });

  it('should return the correct status code and JSON object message for different status', () => {
    const message = { error: 'Unauthorized access' };
    const result = funcResult('Unauthorized', message);
    expect(result).toEqual({ status: 401, jsonBody: message });
  });

  it('should return a web ReadableStream as body', () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    const result = funcResult('OK', stream);
    const typedResult: { status: number; body: ReadableStream } = result;

    expect(typedResult).toEqual({ status: 200, body: stream });
    expect(result).toEqual({ status: 200, body: stream });
  });

  it('should return a node readable stream as body', () => {
    const stream = Readable.from(['hello']);
    const result = funcResult('OK', stream);
    const typedResult: { status: number; body: Readable } = result;

    expect(typedResult).toEqual({ status: 200, body: stream });
    expect(result).toEqual({ status: 200, body: stream });
  });

  it('should return an async iterable as body', () => {
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield new Uint8Array([1, 2, 3]);
      },
    };
    const result = funcResult('OK', stream);
    const typedResult: { status: number; body: typeof stream } = result;

    expect(typedResult).toEqual({ status: 200, body: stream });
    expect(result).toEqual({ status: 200, body: stream });
  });
});
