'use client'

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type PageWrapperProps = {
  children: ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname();
  const isTopPage = pathname === '/';

  return (
    <body className={isTopPage ? 'isTop' : 'isUnderPage'}>
      {children}
    </body>
  );
}