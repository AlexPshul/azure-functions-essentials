import { hello } from '../src/index';

test('hello returns Hello World', () => {
  expect(hello()).toBe('Hello World');
});
