import { json, type ClientLoaderFunctionArgs } from '@remix-run/react';
import { getModelsData, type ModelsResponse } from '~/lib/api/models';

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<Response> {
  const data = await getModelsData(request);
  return json<ModelsResponse>(data);
}
