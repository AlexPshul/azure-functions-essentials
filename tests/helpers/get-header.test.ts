import { HttpRequest } from '@azure/functions';
import { getHeader, getHeaderArray, getHeaderFlag } from '../../src/helpers/get-header';

describe('getHeader', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://www.pshul.com',
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
        'x-flag-true': 'true',
        'x-flag-false': 'false',
        'x-empty-header': '',
      },
    });
  });

  it('should return the header value when it exists', () => {
    const result = getHeader(mockRequest, 'content-type');
    expect(result).toBe('application/json');
  });

  it('should return the custom header value when it exists', () => {
    const result = getHeader(mockRequest, 'x-custom-header');
    expect(result).toBe('custom-value');
  });

  it('should return null for optional headers when they do not exist', () => {
    const result = getHeader(mockRequest, 'non-existing-header', true);
    expect(result).toBeNull();
  });

  it('should throw an error for required headers when they do not exist', () => {
    expect(() => {
      getHeader(mockRequest, 'non-existing-header');
    }).toThrow('[non-existing-header] header is required');
  });

  it('should throw an error when explicitly marking a non-existing header as required', () => {
    expect(() => {
      getHeader(mockRequest, 'non-existing-header', false);
    }).toThrow('[non-existing-header] header is required');
  });
});

describe('getHeaderFlag', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://www.pshul.com',
      method: 'GET',
      headers: {
        'x-flag-true': 'true',
        'x-flag-yes': 'yes',
        'x-flag-false': 'false',
        'x-flag-empty': '',
      },
    });
  });

  it('should return true when the flag value is "true"', () => {
    const result = getHeaderFlag(mockRequest, 'x-flag-true');
    expect(result).toBe(true);
  });

  it('should return true when the flag value is not "false"', () => {
    const result = getHeaderFlag(mockRequest, 'x-flag-yes');
    expect(result).toBe(true);
  });

  it('should return true when the flag value is empty', () => {
    const result = getHeaderFlag(mockRequest, 'x-flag-empty');
    expect(result).toBe(true);
  });

  it('should return false when the flag value is "false"', () => {
    const result = getHeaderFlag(mockRequest, 'x-flag-false');
    expect(result).toBe(false);
  });

  it('should return false when the flag does not exist', () => {
    const result = getHeaderFlag(mockRequest, 'x-non-existing-flag');
    expect(result).toBe(false);
  });
});

describe('getHeaderArray', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://www.pshul.com',
      method: 'GET',
      headers: {
        accept: 'text/html, application/xhtml+xml, application/xml',
        'x-custom-list-semicolon': 'item1; item2; item3',
        'x-empty-list': '',
        'x-single-item': 'only-item',
        'x-list-with-spaces': '  item1  ,  item2  ,  item3  ',
      },
    });
  });

  it('should split a comma-separated header into an array', () => {
    const result = getHeaderArray(mockRequest, 'accept');
    expect(result).toEqual(['text/html', 'application/xhtml+xml', 'application/xml']);
  });

  it('should split a header using a custom separator', () => {
    const result = getHeaderArray(mockRequest, 'x-custom-list-semicolon', ';');
    expect(result).toEqual(['item1', 'item2', 'item3']);
  });

  it('should return an empty array for an empty header value', () => {
    const result = getHeaderArray(mockRequest, 'x-empty-list');
    expect(result).toEqual([]);
  });

  it('should return an array with a single item for a non-list header', () => {
    const result = getHeaderArray(mockRequest, 'x-single-item');
    expect(result).toEqual(['only-item']);
  });

  it('should return an empty array when the header does not exist', () => {
    const result = getHeaderArray(mockRequest, 'x-non-existing-header');
    expect(result).toEqual([]);
  });

  it('should trim whitespace from array items', () => {
    const result = getHeaderArray(mockRequest, 'x-list-with-spaces');
    expect(result).toEqual(['item1', 'item2', 'item3']);
  });
});
