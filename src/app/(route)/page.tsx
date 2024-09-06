import React from 'react'
import styles from './page.module.scss'
import Link from 'next/link'
import Loading from '@/app/loading'
import Image from 'next/image'
import  Button from '@/app/components/Button'

const Home = () => {
  return (
    <>

      <div className="globalConatiner">

        <div className={styles.iamgeListWrap}>
          <div className={styles.iamgeList}>

              <Image src="/img/image01.jpg" alt="" width={195} height={195}></Image>
              <Image src="/img/image02.jpg" alt="" width={195} height={195}></Image>
              <Image src="/img/image03.jpg" alt="" width={195} height={195}></Image>
              <Image src="/img/image04.jpg" alt="" width={195} height={195}></Image>
              <Image src="/img/image05.jpg" alt="" width={195} height={195}></Image>
          </div>
        </div>

        <div className={`w-[80%] md:w-[50%] mx-auto grid gap-4`}>
          <Button text="👾モンスターを生成する" href="/create" className="buttonFull"></Button>
        </div>

      </div>




    </>

  )
}

export default Home