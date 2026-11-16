import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

// Variantes alignées sur la direction visuelle (shadcn-vue, thème Oh My Desk).
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-ink text-white hover:bg-ink/90',
        accent: 'bg-tangerine text-ink hover:bg-tangerine/90',
        outline: 'border border-line-strong bg-white text-ink hover:bg-lilac',
        ghost: 'text-ink hover:bg-lilac',
        chrome: 'border border-chrome-line bg-transparent text-chrome-text hover:bg-chrome-line',
        'chrome-ghost': 'bg-transparent text-chrome-text hover:bg-chrome-line',
        destructive: 'border border-[#5a2a30] bg-[#2a1a20] text-[#ff9a9a] hover:bg-[#3a1f27]',
        link: 'text-link underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-[18px] text-[15px]',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-[54px] px-6 text-base',
        icon: 'size-11',
        'icon-sm': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
