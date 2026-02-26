import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { OnboardingModal } from '~/components/onboarding/OnboardingModal';
import { LandingPage } from '~/components/landing/LandingPage.client';

export const meta: MetaFunction = () => {
  return [{ title: 'Astro' }, { name: 'description', content: 'Talk with Astro, an AI assistant from StackBlitz' }];
};

export const clientLoader = () => {
  return {};
};

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-Astro-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => {
          const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
          
          if (isTauri) {
            return (
              <>
                <Chat />
                <OnboardingModal />
              </>
            );
          }

          return <LandingPage />;
        }}
      </ClientOnly>
    </div>
  );
}

