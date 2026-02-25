import { type ClientLoaderFunctionArgs } from '@remix-run/react';
import { default as IndexRoute } from './_index';

export function clientLoader({ params }: ClientLoaderFunctionArgs) {
  return { id: params.id };
}

export default IndexRoute;
