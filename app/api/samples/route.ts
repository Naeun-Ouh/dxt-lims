import { z } from 'zod';
import { sampleOperation } from '@/src/infrastructure/postgres/sample-lifecycle';
import { developmentPrincipalId } from '@/src/infrastructure/postgres/authorization';
import { PgDatabase } from '@/src/infrastructure/postgres/pg-database';
import { ApplicationError } from '@/src/application/repository-ports';
let database: PgDatabase | undefined;
export async function POST(request: Request) {
  return handleSampleRequest(request, async (raw) => {
    if (process.env.DXT_REPOSITORY !== 'postgres')
      throw new ApplicationError(
        'FORBIDDEN',
        'Sample persistence is unavailable.',
      );
    const pid = developmentPrincipalId();
    database ??= PgDatabase.fromEnvironment();
    return sampleOperation(database, pid, raw);
  });
}
export async function handleSampleRequest(
  request: Request,
  execute: (raw: unknown) => Promise<unknown>,
) {
  const response = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    return response(await execute(await request.json()));
  } catch (e) {
    if (e instanceof z.ZodError)
      return response(
        {
          code: 'VALIDATION',
          error: 'Check the highlighted Sample fields.',
          fields: e.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        400,
      );
    if (e instanceof ApplicationError)
      return response(
        { code: e.code, error: e.message },
        e.code === 'FORBIDDEN' ? 403 : e.code === 'NOT_FOUND' ? 404 : 409,
      );
    return response(
      {
        code: 'PERSISTENCE',
        error: 'Sample could not be saved. Check your input and try again.',
      },
      503,
    );
  }
}
