import Link from 'next/link'
import React from 'react'

const Terms = () => {
  return (
    <>
      <div>TERMS</div>
      <ul>
        <li><Link href="/">HOME</Link></li>
        <li><Link href="/about">ABOUT</Link></li>
        <li><Link href="/create">CREATE</Link></li>
        <li><Link href="/terms">TERMS</Link></li>
      </ul>
    </>
  )
}

export default Terms