import { classNames } from '~/utils/classNames';

interface AstroLogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

export function AstroLogo({ className, textClassName, iconClassName }: AstroLogoProps) {
  return (
    <span className={classNames('inline-flex items-center gap-2 group cursor-default', className)}>
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg" 
        className={classNames("w-6 h-6 text-[#168AE6] transition-transform duration-300 group-hover:-translate-y-0.5", iconClassName)}
      >
        <path d="M12.98 2.336c-.46-.448-1.5-.448-1.96 0-2.392 2.332-4.04 5.92-4.04 9.664 0 .972.112 1.92.32 2.832l-1.844 2.82c-.372.568-.112 1.344.536 1.504l3.18.796v2.108c0 .592.58.988 1.12.768l1.708-.684 1.708.684c.54.22 1.12-.176 1.12-.768v-2.108l3.18-.796c.648-.16.908-.936.536-1.504l-1.844-2.82c.208-.912.32-1.86.32-2.832 0-3.744-1.648-7.332-4.04-9.664zm-1.42 12.368a1.56 1.56 0 11.88 0 1.56 1.56 0 01-.88 0z" />
      </svg>
      <span className={classNames('text-xl font-bold tracking-tight text-Astro-elements-textPrimary', textClassName)}>
        Astro
      </span>
    </span>
  );
}
