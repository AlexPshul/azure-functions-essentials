const mockTimer = jest.fn();

describe('registerKeepAlive', () => {
  beforeEach(() => {
    jest.resetModules();
    mockTimer.mockReset();
    jest.doMock('@azure/functions', () => ({
      app: {
        timer: mockTimer,
      },
    }));
  });

  it('should register one timer function with the default options', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive();

    expect(mockTimer).toHaveBeenCalledTimes(1);
    expect(mockTimer).toHaveBeenCalledWith(
      'keepAlive',
      expect.objectContaining({
        schedule: '0 */5 * * * *',
        runOnStartup: false,
        useMonitor: true,
        handler: expect.any(Function),
      }),
    );
  });

  it('should preserve explicit overrides', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive({
      schedule: '0 */10 * * * *',
      name: 'myKeepAlive',
      runOnStartup: true,
      useMonitor: false,
    });

    expect(mockTimer).toHaveBeenCalledWith(
      'myKeepAlive',
      expect.objectContaining({
        schedule: '0 */10 * * * *',
        runOnStartup: true,
        useMonitor: false,
        handler: expect.any(Function),
      }),
    );
  });

  it('should not register when disabled', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive({ enabled: false });

    expect(mockTimer).not.toHaveBeenCalled();
  });

  it('should not register twice within the same process', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive();
    registerKeepAlive({ schedule: '0 */10 * * * *', name: 'anotherKeepAlive' });

    expect(mockTimer).toHaveBeenCalledTimes(1);
    expect(mockTimer).toHaveBeenCalledWith(
      'keepAlive',
      expect.objectContaining({
        schedule: '0 */5 * * * *',
      }),
    );
  });

  it('should optionally log the default execution message', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive({ log: true });

    const [, options] = mockTimer.mock.calls[0];
    const context = { log: jest.fn() };

    options.handler({ isPastDue: true }, context);

    expect(context.log).toHaveBeenCalledWith('Keep-alive timer executed after a missed schedule.');
  });

  it('should optionally log a custom execution message', async () => {
    const { registerKeepAlive } = await import('../../src/helpers/register-keep-alive');

    registerKeepAlive({ log: 'Still warm.' });

    const [, options] = mockTimer.mock.calls[0];
    const context = { log: jest.fn() };

    options.handler({ isPastDue: false }, context);

    expect(context.log).toHaveBeenCalledWith('Still warm.');
  });
});

describe('root exports', () => {
  beforeEach(() => {
    jest.resetModules();
    mockTimer.mockReset();
    jest.doMock('@azure/functions', () => ({
      app: {
        timer: mockTimer,
      },
    }));
  });

  it('should re-export registerKeepAlive from the package root', async () => {
    const module = await import('../../src');

    expect(module.registerKeepAlive).toBeDefined();
  });
});
