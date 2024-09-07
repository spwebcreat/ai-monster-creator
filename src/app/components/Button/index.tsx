import React from 'react'
import Link from 'next/link'
import styles from './Button.module.scss'

type IconProps = {
  className?: string;
}

type IconComponent = React.ComponentType<IconProps>;

type ButtonProps = {
  text: string;
  href?: string;
  className?: string;
  onClick?: () => void;
  download?: string;
  iconProps?: {
    icon: IconComponent;
    className?: string;
  };
}

export const Button = ({ text, href, className, download, iconProps }: ButtonProps) => {
  const IconComponent = iconProps?.icon;

  return (
    <Link 
      className={`${styles.button} ${className ? styles[className] : ''}`} 
      href={href ?? "/"}
      download={download}
    >
      {IconComponent && <IconComponent className={iconProps.className} />}
      <span>{text}</span>
    </Link>
  )
}

export const ButtonSubmit = ({ text, className, iconProps }: ButtonProps) => {
  const IconComponent = iconProps?.icon;

  return (
    <button 
      className={`${styles.button} ${className ? styles[className] : ''}`} 
      type="submit"
    >
      {IconComponent && <IconComponent className={iconProps.className} />}
      <span>{text}</span>
    </button>
  )
}

export const ButtonShare = ({ text, className, onClick, iconProps }: ButtonProps) => {
  const IconComponent = iconProps?.icon;

  return (
    <button 
      className={`${styles.button} ${className ? styles[className] : ''}`} 
      onClick={onClick}
    >
      {IconComponent && <IconComponent className={iconProps.className} />}
      <span>{text}</span>
    </button>
  )
}

export default Button