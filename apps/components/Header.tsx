"use client";

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import NavItems from './NavItems'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

const Header = () => {
    return (
        <header className='sticky top-0 header bg-black/50 backdrop-blur-md z-50'>
            <div className='container header-wrapper flex justify-between items-center py-4'>
                <Link href="/">
                    <Image src="/baologo.png" alt='FlashBao Logo' width={140} height={32} className='h-8 w-auto cursor-pointer' />
                </Link>
                <nav className='hidden sm:block'>
                    <NavItems/>
                </nav>
                <div className="flex items-center gap-4">
                    <WalletMultiButtonDynamic />
                </div>
            </div>
        </header>
    )
}

export default Header
