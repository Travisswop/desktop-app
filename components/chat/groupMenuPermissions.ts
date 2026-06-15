export interface GroupMenuParticipant {
  userId: unknown;
  role?: string;
  permissions?: string[];
}

export interface GroupMenuGroup {
  participants?: GroupMenuParticipant[];
  createdBy?: unknown;
}

export function getObjectIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedId = record._id ?? record.id ?? record.$oid;
    if (nestedId && nestedId !== value) {
      return getObjectIdString(nestedId);
    }

    if (typeof record.toHexString === 'function') {
      return String(record.toHexString());
    }

    const stringValue = String(value);
    return stringValue === '[object Object]' ? '' : stringValue;
  }
  return String(value);
}

export function getParticipantId(participant: GroupMenuParticipant): string {
  return getObjectIdString(participant.userId);
}

function hasParticipantPermission(
  participant: GroupMenuParticipant | undefined,
  permission: string,
): boolean {
  return Boolean(
    Array.isArray(participant?.permissions) &&
      participant.permissions.includes(permission),
  );
}

function hasAnyParticipantPermission(
  participant: GroupMenuParticipant | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) =>
    hasParticipantPermission(participant, permission),
  );
}

export function getGroupMenuPermissions(
  group: GroupMenuGroup,
  currentUser: unknown,
) {
  const currentUserId = getObjectIdString(currentUser);
  const me = group.participants?.find(
    (participant) => getParticipantId(participant) === currentUserId,
  );
  const isCreator = getObjectIdString(group.createdBy) === currentUserId;
  const isAdmin = me?.role === 'admin';
  const hasLegacyPermissionShape =
    Boolean(me) && !Array.isArray(me?.permissions);

  return {
    canManageMembers:
      isCreator ||
      isAdmin ||
      hasAnyParticipantPermission(me, [
        'manage_members',
        'add_participants',
        'remove_participants',
      ]) ||
      hasLegacyPermissionShape,
    canEditInfo:
      isCreator ||
      isAdmin ||
      hasLegacyPermissionShape ||
      hasParticipantPermission(me, 'edit_group_info'),
    canDelete: isCreator || isAdmin,
  };
}
