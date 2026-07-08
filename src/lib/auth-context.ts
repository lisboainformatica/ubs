import { headers } from 'next/headers';

export async function getTenantContext() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const role = headersList.get('x-user-role');
  const municipalityId = headersList.get('x-municipality-id');
  const municipalitySlug = headersList.get('x-municipality-slug');

  return {
    userId: userId || null,
    role: role || null,
    municipalityId: municipalityId || null,
    municipalitySlug: municipalitySlug || null,
  };
}
