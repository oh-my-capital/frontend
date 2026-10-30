import type { CSSProperties } from "react";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiAddLine, RiArrowLeftSLine, RiArrowRightLine, RiArrowRightSLine, RiBankLine, RiBook2Line, RiCalculatorLine, RiCalendarLine,
  RiCheckLine, RiCloseLine, RiErrorWarningLine, RiFileListLine, RiInformationLine, RiLockLine, RiNotification3Line, RiPauseLine,
  RiPlayFill, RiSearchLine, RiSettings3Line, RiTimeLine, RiUserLine, RiWalletLine,
} from "@remixicon/react";

/**
 * @remixicon/react 선형 아이콘 래퍼. 보조 용도로만 16~20px(ui-guidelines §2). 색은 currentColor.
 * 이름을 늘릴 때는 여기에만 추가한다. 이모지·일러스트 아이콘은 쓰지 않는다.
 */
export type IconName =
  | "arrow" | "next" | "prev" | "plus" | "check" | "close" | "search" | "pause" | "play"
  | "book" | "calculator" | "bank" | "wallet" | "calendar" | "time" | "list" | "alert" | "info" | "lock" | "user" | "settings" | "bell";

const ICONS: Record<IconName, RemixiconComponentType> = {
  arrow: RiArrowRightLine,
  next: RiArrowRightSLine,
  prev: RiArrowLeftSLine,
  plus: RiAddLine,
  check: RiCheckLine,
  close: RiCloseLine,
  search: RiSearchLine,
  pause: RiPauseLine,
  play: RiPlayFill,
  book: RiBook2Line,
  calculator: RiCalculatorLine,
  bank: RiBankLine,
  wallet: RiWalletLine,
  calendar: RiCalendarLine,
  time: RiTimeLine,
  list: RiFileListLine,
  alert: RiErrorWarningLine,
  info: RiInformationLine,
  lock: RiLockLine,
  user: RiUserLine,
  settings: RiSettings3Line,
  bell: RiNotification3Line,
};

export default function Icon({ name, size = 18, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} style={style} className={className} aria-hidden="true" focusable="false" />;
}
