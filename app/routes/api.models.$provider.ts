import { json, type ClientLoaderFunctionArgs } from '@remix-run/react';
import { getModelsData, type ModelsResponse } from '~/lib/api/models';

export async function clientLoader({ request, params }: ClientLoaderFunctionArgs): Promise<Response> {
  const data = await getModelsData(request, params.provider);
  return json<ModelsResponse>(data);
}
