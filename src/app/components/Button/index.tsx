import React from 'react'
import Link from 'next/link'
import styles from './Button.module.scss'

type ButtonProps = {
  text:string;
  href?: string;
  className?: string;
}




const Button = ({text, href, className}: ButtonProps) => {


  return (
    <Link 
      className={`${styles.button} ${className ? styles[className] : ''}`} 
      href={href ?? "/"}
    >
      <span>{text}</span>
    </Link>
  )
}



export default Button