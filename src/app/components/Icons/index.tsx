// https://heroicons.com/

import { ShareIcon,ArrowDownOnSquareIcon } from '@heroicons/react/24/solid'

interface IconProps {
  className?: string;  // オプショナルに変更
}

const IconShare = ({ className }: IconProps) => {
  return (
    <ShareIcon className={className} />
  )
}

const IconDownload = ({ className }: IconProps) => {
  return (
    <ArrowDownOnSquareIcon className={className} />
  )
}

export {
  IconShare,
  IconDownload
}