import { getQuery, getQueryFlag } from '../../src/helpers/get-query';
import { HttpRequest } from '@azure/functions';

describe('getQuery', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://www.pshul.com',
      method: 'GET',
      query: {
        existingParam: 'value',
        flagTrue: 'true',
        flagFalse: 'false',
      },
    });
  });

  it('should return the query parameter value when it exists', () => {
    const result = getQuery(mockRequest, 'existingParam');
    expect(result).toBe('value');
  });

  it('should return null for optional parameters when they do not exist', () => {
    const result = getQuery(mockRequest, 'nonExistingParam', true);
    expect(result).toBeNull();
  });

  it('should throw an error for required parameters when they do not exist', () => {
    expect(() => {
      getQuery(mockRequest, 'nonExistingParam');
    }).toThrow('[nonExistingParam] query param is required');
  });

  it('should throw an error when explicitly marking a non-existing parameter as required', () => {
    expect(() => {
      getQuery(mockRequest, 'nonExistingParam', false);
    }).toThrow('[nonExistingParam] query param is required');
  });
});

describe('getQueryFlag', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://www.pshul.com',
      method: 'GET',
      query: {
        flagTrue: 'true',
        flagYes: 'yes',
        flagFalse: 'false',
        flagEmpty: '',
      },
    });
  });

  it('should return true when the flag value is "true"', () => {
    const result = getQueryFlag(mockRequest, 'flagTrue');
    expect(result).toBe(true);
  });

  it('should return true when the flag value is not "false"', () => {
    const result = getQueryFlag(mockRequest, 'flagYes');
    expect(result).toBe(true);
  });

  it('should return true when the flag value is empty', () => {
    const result = getQueryFlag(mockRequest, 'flagEmpty');
    expect(result).toBe(true);
  });

  it('should return false when the flag value is "false"', () => {
    const result = getQueryFlag(mockRequest, 'flagFalse');
    expect(result).toBe(false);
  });

  it('should return false when the flag does not exist', () => {
    const result = getQueryFlag(mockRequest, 'nonExistingFlag');
    expect(result).toBe(false);
  });
});
