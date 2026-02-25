import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { AstroLogo } from '~/components/ui/AstroLogo';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-Astro-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-Astro-elements-textPrimary cursor-pointer">
        <button
          type="button"
          aria-label="Open sidebar"
          className="grid h-8 w-8 place-items-center rounded-lg border border-Astro-elements-borderColor bg-Astro-elements-background-depth-2 text-Astro-elements-textPrimary"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('astro:toggle-sidebar'));
            }
          }}
        >
          <span className="i-ph:sidebar-simple-duotone text-lg" />
        </button>
        <a href="/" className="text-2xl font-semibold text-accent flex items-center gap-2">
          <AstroLogo />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-Astro-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}

