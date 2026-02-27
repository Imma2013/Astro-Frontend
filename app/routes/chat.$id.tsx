import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';

export function loader({ params }: LoaderFunctionArgs) {
  return { id: params?.id };
}

export default IndexRoute;
