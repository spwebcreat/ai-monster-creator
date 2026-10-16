// https://heroicons.com/

import { 
  ShareIcon,
  ArrowDownOnSquareIcon ,
  SparklesIcon,
} from '@heroicons/react/24/solid'

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

// 生成ボタンの印（絵文字の代わり）
const IconSparkles = ({ className }: IconProps) => {
  return (
    <SparklesIcon className={className} />
  )
}

export {
  IconShare,
  IconDownload,
  IconSparkles
}