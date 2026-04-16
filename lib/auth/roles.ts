export const ROLES = ['viewer', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Role hierarchy — higher index = more privilege. */
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

/** Map Okta group names to app roles. Highest role wins. */
const GROUP_TO_ROLE: Record<string, Role> = {
  'thermal-admins': 'admin',
  'thermal-editors': 'editor',
  'thermal-viewers': 'viewer',
};

/** Returns true if `userRole` meets or exceeds `required`. */
export function hasRole(userRole: Role, required: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

/**
 * Resolve a list of Okta group names to the highest matching app role.
 * Returns 'viewer' if no groups match (authenticated but ungrouped).
 */
export function resolveRole(groups: string[]): Role {
  let best: Role = 'viewer';
  for (const group of groups) {
    const role = GROUP_TO_ROLE[group];
    if (role && ROLE_RANK[role] > ROLE_RANK[best]) {
      best = role;
    }
  }
  return best;
}
