export default {
    plugins: [require('@tailwindcss/typography')],
      safeList: [
        'prose',
        'prose-sm',
        'sm:prose-base',
        'lg:prose-lg',
        'xl:prose-2xl',
        'marker:text-black',
        'prose-li:leading-[0.75]',
        'prose-lead:0.75',
        'prose-lead:leading-[0.75]',
        'prose-p:m-0',
        'prose-headings:mb-0'
      ],
    theme: {
      extend: {
        fontFamily: {
          custom: ['Figtree'],
          body: ['Figtree']
        },
      },
    },
  }