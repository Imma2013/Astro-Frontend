import { type ClientClientClientClientLoaderFunctionArgs } from '@remix-run/react';
import { default as IndexRoute } from './_index';

export function clientLoader({ params }: ClientClientClientClientLoaderFunctionArgs) {
  return { id: params?.id };
}

export default IndexRoute;
