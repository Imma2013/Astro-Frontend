import { json } from '@remix-run/react';

export const loader = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};

export const action = () => {
  return json({ error: 'This API is not available in the local-only desktop app.' }, { status: 501 });
};
