import type { SampleCommand } from '@/src/application/sample-lifecycle';
export class SampleRequestError extends Error {
  constructor(
    public code: string,
    public fields: { path: string; message: string }[] = [],
  ) {
    super(code);
  }
}
export async function sampleRequest<T>(input: SampleCommand): Promise<T> {
  const r = await fetch('/api/samples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  const body = (await r.json()) as {
    code?: string;
    fields?: { path: string; message: string }[];
  };
  if (!r.ok)
    throw new SampleRequestError(body.code ?? 'PERSISTENCE', body.fields ?? []);
  return body as T;
}
