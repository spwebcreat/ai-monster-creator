import Image from 'next/image'
import React from 'react'
import styles from './Header.module.scss'
import Link from 'next/link'

const Header = () => {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <Image src="/img/logo.png" alt="AI MONSTER CREATOR" width={1200} height={265} />
      </Link>
    </header>
  )

}
<picture></picture>
export default Header