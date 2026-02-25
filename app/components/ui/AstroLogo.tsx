import { classNames } from '~/utils/classNames';

interface AstroLogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

export function AstroLogo({ className, textClassName, iconClassName }: AstroLogoProps) {
  return (
    <span className={classNames('inline-flex items-center gap-2.5 group cursor-default', className)}>
      <span
        className={classNames(
          'relative grid h-7 w-7 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3',
          iconClassName,
        )}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,0.45),transparent_50%)]" />
        {/* Sleek Minimalist Rocket SVG */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="relative w-[18px] h-[18px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
        >
          <path 
            d="M12 2C12 2 11 5 11 9C11 13 12 15 12 15M12 2C12 2 13 5 13 9C13 13 12 15 12 15M12 2L9 6L8 11L9 16L12 22L15 16L16 11L15 6L12 2Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M12 15V18M9 16L7 19M15 16L17 19" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={classNames('text-xl font-bold tracking-tight text-Astro-elements-textPrimary font-display', textClassName)}>
        Astro
      </span>
    </span>
  );
}
