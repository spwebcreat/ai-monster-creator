// https://heroicons.com/

import { 
  ShareIcon,
  ArrowDownOnSquareIcon ,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'

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

// 閉じるボタンの印（細い線の × ）
const IconClose = ({ className }: IconProps) => {
  return (
    <XMarkIcon className={className} />
  )
}

export {
  IconShare,
  IconDownload,
  IconSparkles,
  IconClose
}