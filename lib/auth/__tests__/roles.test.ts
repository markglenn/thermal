import { describe, it, expect } from 'vitest';
import { hasRole, resolveRole } from '../roles';

describe('hasRole', () => {
  it('viewer meets viewer', () => {
    expect(hasRole('viewer', 'viewer')).toBe(true);
  });

  it('editor meets viewer', () => {
    expect(hasRole('editor', 'viewer')).toBe(true);
  });

  it('admin meets all roles', () => {
    expect(hasRole('admin', 'viewer')).toBe(true);
    expect(hasRole('admin', 'editor')).toBe(true);
    expect(hasRole('admin', 'admin')).toBe(true);
  });

  it('viewer does not meet editor', () => {
    expect(hasRole('viewer', 'editor')).toBe(false);
  });

  it('viewer does not meet admin', () => {
    expect(hasRole('viewer', 'admin')).toBe(false);
  });

  it('editor does not meet admin', () => {
    expect(hasRole('editor', 'admin')).toBe(false);
  });
});

describe('resolveRole', () => {
  it('returns viewer when no groups match', () => {
    expect(resolveRole([])).toBe('viewer');
    expect(resolveRole(['unrelated-group'])).toBe('viewer');
  });

  it('maps thermal-viewers to viewer', () => {
    expect(resolveRole(['thermal-viewers'])).toBe('viewer');
  });

  it('maps thermal-editors to editor', () => {
    expect(resolveRole(['thermal-editors'])).toBe('editor');
  });

  it('maps thermal-admins to admin', () => {
    expect(resolveRole(['thermal-admins'])).toBe('admin');
  });

  it('picks the highest role when multiple groups match', () => {
    expect(resolveRole(['thermal-viewers', 'thermal-admins'])).toBe('admin');
    expect(resolveRole(['thermal-editors', 'thermal-viewers'])).toBe('editor');
  });

  it('ignores non-thermal groups', () => {
    expect(resolveRole(['other-admins', 'thermal-editors'])).toBe('editor');
  });
});
