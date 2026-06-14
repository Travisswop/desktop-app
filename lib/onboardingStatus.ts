export const AI_ONBOARDING_PATH = '/onboard-ai';
export const SWOP_ID_ONBOARDING_PATH = '/onboard?step=swop-id';

type MicrositeLike = {
  _id?: string | null;
  id?: string | null;
  primary?: boolean | null;
  ens?: string | null;
};

type UserLike = {
  _id?: string | null;
  ens?: string | null;
  ensName?: string | null;
  primaryMicrosite?: string | null;
  microsites?: MicrositeLike[] | null;
};

const normalizeId = (value?: string | null) => String(value || '');

const normalizeEns = (value?: string | null) =>
  String(value || '').trim().toLowerCase();

export function getPrimaryMicrosite(user?: UserLike | null) {
  if (!user?.microsites?.length) return null;
  const primaryMicrositeId = normalizeId(user.primaryMicrosite);

  return (
    user.microsites.find(
      (microsite) =>
        microsite?.primary === true ||
        normalizeId(microsite?._id || microsite?.id) === primaryMicrositeId,
    ) ?? null
  );
}

export function hasClaimedSwopId(user?: UserLike | null) {
  const primaryMicrosite = getPrimaryMicrosite(user);
  const candidate =
    normalizeEns(user?.ensName) ||
    normalizeEns(user?.ens) ||
    normalizeEns(primaryMicrosite?.ens);

  return candidate.endsWith('.swop.id');
}

export function requiresSwopIdCompletion(user?: UserLike | null) {
  return Boolean(user?._id && user?.primaryMicrosite && !hasClaimedSwopId(user));
}
