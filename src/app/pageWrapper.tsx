'use client'

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Motion from '@/app/components/Motion';

type PageWrapperProps = {
  children: ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname();
  let isPage = "";
  switch (pathname) {
    case '/':
      isPage = "isTop"
      break;
    case '/create/':
      isPage = "isCreate"
      break;
    default:
      isPage = "isUnderPage"
      break;
  }
  // console.log(isPage) //デバッグ用
  return (
    <body className={isPage}>
      <Motion>
        {children}
      </Motion>
    </body>
  );
}