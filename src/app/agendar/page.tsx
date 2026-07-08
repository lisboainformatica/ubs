import React from 'react';
import { prisma } from '@/lib/prisma';
import AgendarClientComponent from './agendar-client';

export const dynamic = 'force-dynamic';

export default async function AgendarPage() {
  // Fetch municipalities list for step 1 select
  const municipalities = await prisma.municipality.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { name: 'asc' },
  });

  return <AgendarClientComponent municipalities={municipalities} />;
}
