import { type ClientClientClientClientLoaderFunctionArgs, type MetaFunction } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { GitUrlImport } from '~/components/git/GitUrlImport.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Astro' }, { name: 'description', content: 'Talk with Astro, an AI assistant from StackBlitz' }];
};

export function clientLoader({ params }: ClientClientClientClientLoaderFunctionArgs) {
  return { url: params.url };
}

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-Astro-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <GitUrlImport />}</ClientOnly>
    </div>
  );
}

