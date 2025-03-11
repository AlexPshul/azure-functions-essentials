import { funcResult } from '../../src/helpers/func-result';

describe('funcResult', () => {
  it('should return the correct status code without a message', () => {
    const result = funcResult('OK');
    expect(result).toEqual({ status: 200 });
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
});
