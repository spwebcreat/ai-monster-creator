import React from 'react'
import Button from '../Button'
import styles from './Footer.module.scss'

const Footer = () => {
  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Button text="このサイトについて" href="/about" className="buttonFullSkelton"></Button>
          <Button text="利用規約" href="/terms" className="buttonFullSkelton"></Button>
        </div>
      
        <div className={styles.address}>&copy;ai Monster Creator created by SP WEB CREAT.</div>
      </footer>
    </>
  )
}

export default Footer