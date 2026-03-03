import type { CompanionType } from '../../stores/companionStore';
import { HedgehogSVG } from './HedgehogSVG';
import { FoxSVG } from './FoxSVG';
import { BearCubSVG } from './BearCubSVG';

interface Props {
  type: CompanionType;
  eyeState: 'open' | 'closed';
}

export function CompanionSVG({ type, eyeState }: Props) {
  if (type === 'fox') return <FoxSVG eyeState={eyeState} />;
  if (type === 'bear') return <BearCubSVG eyeState={eyeState} />;
  return <HedgehogSVG eyeState={eyeState} />;
}
