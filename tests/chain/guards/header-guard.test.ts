import { HttpRequest, InvocationContext } from '@azure/functions';
import { headerGuard } from '../../../src/chain/guards';
import { funcResult } from '../../../src/helpers';

describe('headerGuard', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        // Headers will be set in individual tests
      },
    });

    mockContext = new InvocationContext();
  });

  it('should pass when header matches expected string value', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const guard = headerGuard('Content-Type', 'application/json');

    // Act
    const result = await guard.check(mockRequest, mockContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should fail when header has different string value', async () => {
    // Arrange
    mockRequest = new HttpRequest({
      url: 'https://example.com',
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    const guard = headerGuard('Content-Type', 'application/json');

    // Act
    const result = await guard.check(mockRequest, mockContext);

    // Assert
    expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
  });

  it('should fail when required header is missing', async () => {
    // Arrange
    const guard = headerGuard('Content-Type', 'application/json');

    // Act
    const result = await guard.check(mockRequest, mockContext);

    // Assert
    expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
  });
});
