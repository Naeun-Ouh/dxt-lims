import { z } from 'zod';
import { ApplicationError } from '@/src/application/repository-ports';
import { developmentPrincipalId } from '@/src/infrastructure/postgres/authorization';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { recipeSourceCatalog } from '@/src/infrastructure/postgres/postgres-recipe-sources';
let database: PgDatabase | undefined;
export async function POST(request: Request) {
  try {
    if (process.env.DXT_REPOSITORY !== 'postgres')
      throw new ApplicationError(
        'FORBIDDEN',
        'Source references are unavailable.',
      );
    const pid = developmentPrincipalId();
    database ??= PgDatabase.fromEnvironment();
    return Response.json(
      await recipeSourceCatalog(database, pid, await request.json()),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const code =
      error instanceof z.ZodError
        ? 'VALIDATION'
        : error instanceof ApplicationError
          ? error.code
          : 'PERSISTENCE';
    return Response.json(
      {
        code,
        error:
          code === 'FORBIDDEN'
            ? 'Source reference access is not allowed.'
            : 'Source references could not be loaded. Check your selection and try again.',
      },
      {
        status:
          code === 'FORBIDDEN'
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'VALIDATION'
                ? 400
                : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
