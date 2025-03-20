// filepath: d:\repos\azure-functions-essentials\tests\chain\guards\header-array-guard.test.ts
import { HttpRequest, InvocationContext } from '@azure/functions';
import { allValuesHeaderGuard, atLeastOneHeaderGuard, exactValuesHeaderGuard } from '../../../src/chain/guards/header-array-guard';
import { funcResult } from '../../../src/helpers';

describe('Header Array Guards', () => {
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
    context.error = jest.fn(); // Mock the error function
  });

  describe('allValuesHeaderGuard', () => {
    it('should pass when header contains all specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html, image/png',
        },
      });
      const guard = allValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when header contains all specified values with extra values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html, image/png',
        },
      });
      const guard = allValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail when header is missing some specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, image/png',
        },
      });
      const guard = allValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('missing required values'));
    });

    it('should fail when header is missing', async () => {
      // Arrange
      const guard = allValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('missing required values'));
    });

    it('should respect custom separator', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          CustomHeader: 'value1; value2; value3',
        },
      });
      const guard = allValuesHeaderGuard('CustomHeader', ['value1', 'value2'], ';');

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('exactValuesHeaderGuard', () => {
    it('should pass when header contains exactly the specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html',
        },
      });
      const guard = exactValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when header contains exactly the specified values in different order', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'text/html, application/json',
        },
      });
      const guard = exactValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail when header contains extra values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html, image/png',
        },
      });
      const guard = exactValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('does not exactly match'));
    });

    it('should fail when header is missing some specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const guard = exactValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('does not exactly match'));
    });

    it('should fail when header is missing', async () => {
      // Arrange
      const guard = exactValuesHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('does not exactly match'));
    });

    it('should respect custom separator', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          CustomHeader: 'value1; value2',
        },
      });
      const guard = exactValuesHeaderGuard('CustomHeader', ['value1', 'value2'], ';');

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('atLeastOneHeaderGuard', () => {
    it('should pass when header contains at least one specified value', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, image/png',
        },
      });
      const guard = atLeastOneHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when header contains all specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'application/json, text/html, image/png',
        },
      });
      const guard = atLeastOneHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail when header does not contain any of the specified values', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          Accept: 'image/png, text/plain',
        },
      });
      const guard = atLeastOneHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('missing at least one'));
    });

    it('should fail when header is missing', async () => {
      // Arrange
      const guard = atLeastOneHeaderGuard('Accept', ['application/json', 'text/html']);

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', 'Missing or invalid header'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('Accept'));
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('missing at least one'));
    });

    it('should respect custom separator', async () => {
      // Arrange
      mockRequest = new HttpRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {
          CustomHeader: 'value1; value3',
        },
      });
      const guard = atLeastOneHeaderGuard('CustomHeader', ['value1', 'value2'], ';');

      // Act
      const result = await guard.check(mockRequest, context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
