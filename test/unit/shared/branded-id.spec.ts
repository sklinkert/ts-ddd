import { assertUuid, newUuid } from '../../../src/shared/domain/branded-id';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

describe('branded-id', () => {
  it('newUuid returns a valid UUID v7', () => {
    const id = newUuid();
    expect(uuidValidate(id)).toBe(true);
    expect(uuidVersion(id)).toBe(7);
  });

  it('assertUuid throws on invalid input', () => {
    expect(() => assertUuid('not-a-uuid', 'TestId')).toThrow(/TestId/);
  });

  it('assertUuid passes for valid uuid', () => {
    expect(() => assertUuid(newUuid(), 'TestId')).not.toThrow();
  });
});
