import { HttpRequest, InvocationContext } from '@azure/functions';
import { headerFlagGuard } from '../../../src/chain/guards';
import { funcResult } from '../../../src/helpers';

describe('headerFlagGuard', () => {
  let mockRequest: HttpRequest;
  let context: InvocationContext;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        // Headers will be set in individual tests
      },
    });

    context = new InvocationContext();
    jest.spyOn(context, 'log');
  });

  it('should pass when header exists with "true" value', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'X-Feature-Enabled': 'true',
      },
    });
    const guard = headerFlagGuard('X-Feature-Enabled');

    // Act
    const result = await guard.check(mockRequest, context);

    // Assert
    expect(result).toBe(true);
  });

  it('should pass when header exists with any value except "false"', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'X-Feature-Enabled': 'yes',
      },
    });
    const guard = headerFlagGuard('X-Feature-Enabled');

    // Act
    const result = await guard.check(mockRequest, context);

    // Assert
    expect(result).toBe(true);
  });

  it('should fail when header value is "false"', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'X-Feature-Enabled': 'false',
      },
    });
    const guard = headerFlagGuard('X-Feature-Enabled');

    // Act
    const result = await guard.check(mockRequest, context);

    // Assert
    expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
    expect(context.log).toHaveBeenCalledWith(expect.stringContaining('X-Feature-Enabled'));
  });

  it('should fail when header is missing', async () => {
    // Arrange
    const guard = headerFlagGuard('X-Feature-Enabled');

    // Act
    const result = await guard.check(mockRequest, context);

    // Assert
    expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
    expect(context.log).toHaveBeenCalledWith(expect.stringContaining('X-Feature-Enabled'));
  });

  it('should be case-insensitive when checking for "false" value', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'X-Feature-Enabled': 'FALSE',
      },
    });
    const guard = headerFlagGuard('X-Feature-Enabled');

    // Act
    const result = await guard.check(mockRequest, context);

    // Assert
    expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
  });
});
