'use client'

import React from 'react'
import { AnimatePresence,motion } from 'framer-motion'
import { usePathname } from 'next/navigation';

export default function Motion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    // <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 ,x:100}} // 初期状態
        animate={{ opacity: 1 ,x:0}} // マウント時
        exit={{ opacity: 0 ,x:-100}}    // アンマウント時
        transition={{duration: 0.5,delay: 0.5}}
      >
        {children}
      </motion.div>
    // </AnimatePresence>
  )
}